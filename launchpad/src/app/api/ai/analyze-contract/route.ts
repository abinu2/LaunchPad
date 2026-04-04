/**
 * POST /api/ai/analyze-contract
 *
 * Fast path (preferred): client sends { fileBase64, fileMimeType, ... }
 *   PDFs  → pdf-parse (no AI for extraction) + Groq text analysis (~3–5s)
 *   Images → Groq vision does OCR + analysis in ONE call (~2–4s)
 *
 * Fallback: client sends { fileUrl, fileMimeType, ... }
 *   → API downloads from Vercel Blob, then same paths as above
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import {
  analyzeImageWithGroqVision,
  extractDocumentText,
  generatePreferredJSON,
  isSupportedDocumentMimeType,
  isImageMimeType,
  normalizeDocumentMimeType,
} from "@/lib/document-ai";
import { fetchWithRetry } from "@/lib/fetch-file";
import { prisma } from "@/lib/prisma";
import { serializeContract } from "@/lib/serializers";
import type { Contract, ContractAnalysis, ContractObligation } from "@/types/contract";
import { LONG_CONTEXT_MODEL } from "@/lib/vertex-ai";

export const maxDuration = 120;

const CONTRACT_JSON_SCHEMA = `{
  "summary": "2-3 sentence plain English summary",
  "contractType": "service_agreement|vendor_agreement|lease|partnership|employment|financing|other",
  "counterpartyName": "Name of the other party",
  "effectiveDate": "YYYY-MM-DD or null",
  "expirationDate": "YYYY-MM-DD or null",
  "autoRenews": true or false,
  "autoRenewalDate": "YYYY-MM-DD or null",
  "autoRenewalNoticePeriod": number or null,
  "terminationNoticePeriod": number or null,
  "totalValue": number or null,
  "monthlyValue": number or null,
  "healthScore": number 0-100,
  "riskLevel": "low|medium|high|critical",
  "clauses": [{"clauseNumber":"","clauseTitle":"","originalText":"","plainEnglish":"","riskLevel":"safe|caution|danger","issue":null,"recommendation":null,"businessImpact":null,"playbookClause":null}],
  "missingProtections": ["string"],
  "conflicts": [],
  "recommendations": ["string"],
  "estimatedAnnualCost": number or null,
  "counterProposalDraft": "string or null",
  "playbookDeviations": [{"clauseTitle":"","currentLanguage":"","playbookLanguage":"","reason":""}],
  "obligations": [{"clauseRef":"","description":"","party":"business|counterparty","triggerType":"date|event|threshold|recurring","triggerDescription":"","dueDate":null,"recurringFrequency":null,"status":"pending","monitoredField":null,"monitoredThreshold":null,"notes":null}]
}`;

function buildTextPrompt(contractText: string, businessContext: string, existingSummaries: string): string {
  return `You are an expert business attorney reviewing a contract for a small business owner. Explain everything in plain English while being legally precise.

${businessContext}

EXISTING CONTRACTS (for conflict detection):
${existingSummaries || "None."}

CONTRACT TEXT:
${contractText}

Return ONLY a JSON object matching this exact schema. No markdown, no explanation:
${CONTRACT_JSON_SCHEMA}

RULES:
- healthScore: 90-100=clean, 70-89=minor issues, 50-69=significant concerns, <50=major problems
- Flag personal guarantees, non-competes, one-sided indemnification, auto-renewals
- counterProposalDraft: professional legal language the owner can send to the counterparty
- conflicts: [] (leave empty unless you see a direct conflict with the existing contracts listed above)`;
}

function buildVisionPrompt(businessContext: string, existingSummaries: string): string {
  return `You are an expert business attorney. Read every visible word of this contract document and analyze it for a small business owner.

${businessContext}

EXISTING CONTRACTS:
${existingSummaries || "None."}

Return ONLY a JSON object matching this exact schema. No markdown:
${CONTRACT_JSON_SCHEMA}

RULES:
- healthScore: 90-100=clean, 70-89=minor issues, 50-69=significant, <50=major problems
- Flag personal guarantees, non-competes, one-sided indemnification, auto-renewals
- counterProposalDraft: legal language the owner can send back`;
}

type ContractAIResult = {
  summary: string;
  contractType: Contract["contractType"];
  counterpartyName: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  autoRenews: boolean;
  autoRenewalDate: string | null;
  autoRenewalNoticePeriod: number | null;
  terminationNoticePeriod: number | null;
  totalValue: number | null;
  monthlyValue: number | null;
  healthScore: number;
  riskLevel: ContractAnalysis["riskLevel"];
  clauses: ContractAnalysis["clauses"];
  missingProtections: string[];
  conflicts: ContractAnalysis["conflicts"];
  recommendations: string[];
  estimatedAnnualCost: number | null;
  counterProposalDraft: string | null;
  playbookDeviations: ContractAnalysis["playbookDeviations"];
  obligations: Omit<ContractObligation, "id" | "lastChecked">[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      fileBase64?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileMimeType?: string;
      businessId?: string;
    };

    const { fileBase64, fileUrl, fileName, fileType, businessId } = body;
    const fileMimeType = body.fileMimeType ?? "";

    if (!businessId || (!fileBase64 && !fileUrl)) {
      return NextResponse.json(
        { error: "businessId and either fileBase64 or fileUrl are required" },
        { status: 400 }
      );
    }

    const normalizedMime = normalizeDocumentMimeType(
      fileMimeType || (fileType === "pdf" ? "application/pdf" : "")
    );

    if (!isSupportedDocumentMimeType(normalizedMime)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF or image (JPG, PNG, WEBP)." },
        { status: 415 }
      );
    }

    await requireBusinessAccess(businessId);

    // ── Resolve file buffer ───────────────────────────────────────────────────
    let fileBuffer: Buffer;
    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, "base64");
    } else {
      const fileRes = await fetchWithRetry(fileUrl!);
      fileBuffer = Buffer.from(await fileRes.arrayBuffer());
    }

    // ── Business context & existing contracts ─────────────────────────────────
    const [biz, existingContracts] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.contract.findMany({
        where: { businessId, status: { in: ["active", "expiring_soon"] } },
      }),
    ]);

    const serviceTypes =
      biz && Array.isArray(biz.serviceTypes) ? (biz.serviceTypes as { name?: string }[]) : [];

    const businessContext = biz
      ? `BUSINESS CONTEXT:
- Business: ${biz.businessName} (${biz.businessType})
- Entity: ${biz.entityType} in ${biz.entityState}
- Owner: ${biz.ownerName}
- Monthly revenue: $${biz.monthlyRevenueAvg ?? 0}
- Services: ${serviceTypes.map((s) => s.name).filter(Boolean).join(", ") || "n/a"}
- Has employees: ${biz.hasEmployees}`
      : "BUSINESS CONTEXT: Not available.";

    const existingSummaries = existingContracts
      .map((c: { id: string; counterpartyName: string; contractType: string; analysis: unknown }) => {
        const analysis = (c.analysis ?? {}) as { summary?: string };
        return `ID: ${c.id} | ${c.counterpartyName} (${c.contractType}) | ${analysis.summary ?? "N/A"}`;
      })
      .join("\n");

    // ── AI analysis ───────────────────────────────────────────────────────────
    let ai: ContractAIResult;

    if (isImageMimeType(normalizedMime)) {
      // Image contract: Groq vision does OCR + analysis in one shot
      const visionResult = await analyzeImageWithGroqVision<ContractAIResult>(
        buildVisionPrompt(businessContext, existingSummaries),
        fileBuffer,
        normalizedMime
      );

      if (visionResult) {
        ai = visionResult;
      } else {
        // Groq vision not configured: extract text via Gemini OCR then analyze
        const contractText = await extractDocumentText(fileBuffer, normalizedMime, {
          minCharacters: 50,
          preferOcr: true,
        });
        ai = await generatePreferredJSON<ContractAIResult>(
          buildTextPrompt(contractText, businessContext, existingSummaries),
          { geminiModel: LONG_CONTEXT_MODEL }
        );
      }
    } else {
      // PDF: extract text with pdf-parse, send to Groq text model
      const contractText = await extractDocumentText(fileBuffer, normalizedMime, {
        minCharacters: 50,
        preferOcr: false,
      });
      ai = await generatePreferredJSON<ContractAIResult>(
        buildTextPrompt(contractText, businessContext, existingSummaries),
        { geminiModel: LONG_CONTEXT_MODEL }
      );
    }

    // ── Persist to database ───────────────────────────────────────────────────
    const now = new Date();
    let status: Contract["status"] = "active";
    if (ai.expirationDate) {
      const days = Math.ceil((new Date(ai.expirationDate).getTime() - now.getTime()) / 86400000);
      if (days < 0) status = "expired";
      else if (days <= 30) status = "expiring_soon";
    }

    const obligations: ContractObligation[] = (ai.obligations ?? []).map((obligation, index) => ({
      ...obligation,
      id: `obl_${Date.now()}_${index}`,
      lastChecked: new Date().toISOString(),
    }));

    const contract = await prisma.contract.create({
      data: {
        businessId,
        fileName: fileName ?? "contract",
        fileUrl: fileUrl ?? "",
        fileType: fileType ?? "pdf",
        contractType: ai.contractType ?? "other",
        counterpartyName: ai.counterpartyName ?? "Unknown",
        effectiveDate: ai.effectiveDate ?? null,
        expirationDate: ai.expirationDate ?? null,
        autoRenews: ai.autoRenews ?? false,
        autoRenewalDate: ai.autoRenewalDate ?? null,
        autoRenewalNoticePeriod: ai.autoRenewalNoticePeriod ?? null,
        terminationNoticePeriod: ai.terminationNoticePeriod ?? null,
        totalValue: ai.totalValue ?? null,
        monthlyValue: ai.monthlyValue ?? null,
        healthScore: ai.healthScore ?? 75,
        status,
        analysis: JSON.parse(
          JSON.stringify({
            summary: ai.summary,
            riskLevel: ai.riskLevel,
            clauses: ai.clauses ?? [],
            missingProtections: ai.missingProtections ?? [],
            conflicts: ai.conflicts ?? [],
            recommendations: ai.recommendations ?? [],
            estimatedAnnualCost: ai.estimatedAnnualCost,
            counterProposalDraft: ai.counterProposalDraft,
            playbookDeviations: ai.playbookDeviations ?? [],
          })
        ),
        obligations: JSON.parse(JSON.stringify(obligations)),
      },
    });

    return NextResponse.json(serializeContract(contract));
  } catch (err) {
    console.error("analyze-contract error:", err);
    const message = err instanceof Error ? err.message : "Contract analysis failed";
    const isConfig =
      message.includes("API_KEY") ||
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.includes("GROQ_API_KEY") ||
      message.includes("GEMINI_API_KEY");
    return NextResponse.json(
      { error: isConfig ? message : "Contract analysis failed — please try again" },
      { status: 500 }
    );
  }
}
