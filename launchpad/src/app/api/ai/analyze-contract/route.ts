/**
 * POST /api/ai/analyze-contract
 *
 * Optimized for Vercel Hobby plan (10 s function limit).
 * All independent I/O is parallelized. Prompts are lean.
 *
 * PDFs  → pdf-parse + Groq text  (~4-7 s total)
 * Images → Groq vision one-shot  (~3-5 s total)
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
import { serializeContract } from "@/lib/serializers";
import type { Contract, ContractAnalysis, ContractObligation } from "@/types/contract";
import { prisma } from "@/lib/prisma";

export const maxDuration = 10;
const MAX_CONTRACT_ANALYSIS_CHARS = 40_000;

/* ── Lean JSON schema — only fields the app actually uses ──────────────────── */
const CONTRACT_SCHEMA = `{
  "summary":"2-3 sentence plain English summary",
  "contractType":"service_agreement|vendor_agreement|lease|partnership|employment|financing|other",
  "counterpartyName":"string",
  "effectiveDate":"YYYY-MM-DD or null",
  "expirationDate":"YYYY-MM-DD or null",
  "autoRenews":boolean,
  "autoRenewalDate":"YYYY-MM-DD or null",
  "autoRenewalNoticePeriod":number|null,
  "terminationNoticePeriod":number|null,
  "totalValue":number|null,
  "monthlyValue":number|null,
  "healthScore":0-100,
  "riskLevel":"low|medium|high|critical",
  "clauses":[{"clauseTitle":"","plainEnglish":"","riskLevel":"safe|caution|danger","issue":null,"recommendation":null}],
  "missingProtections":["string"],
  "recommendations":["string"],
  "estimatedAnnualCost":number|null,
  "obligations":[{"description":"","party":"business|counterparty","triggerType":"date|event|recurring","dueDate":null,"recurringFrequency":null,"status":"pending"}]
}`;

function buildPrompt(contractText: string, bizName: string): string {
  return `You are a business attorney. Analyze this contract for a small business owner named "${bizName}". Be concise.

CONTRACT TEXT:
${contractText}

Return ONLY valid JSON matching this schema (no markdown):
${CONTRACT_SCHEMA}

Score: 90-100=clean, 70-89=minor, 50-69=significant, <50=major. Flag personal guarantees, non-competes, auto-renewals, one-sided indemnification.`;
}

function limitContractText(text: string) {
  if (text.length <= MAX_CONTRACT_ANALYSIS_CHARS) {
    return text;
  }

  return (
    text.slice(0, MAX_CONTRACT_ANALYSIS_CHARS) +
    "\n\n[Document truncated for fast analysis. Focus on the visible content above.]"
  );
}

function buildVisionPrompt(bizName: string): string {
  return `You are a business attorney. Read this contract image and analyze it for "${bizName}".

Return ONLY valid JSON (no markdown):
${CONTRACT_SCHEMA}

Score: 90-100=clean, 70-89=minor, 50-69=significant, <50=major. Flag personal guarantees, non-competes, auto-renewals.`;
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
  recommendations: string[];
  estimatedAnnualCost: number | null;
  obligations: Omit<ContractObligation, "id" | "lastChecked">[];
  // Optional fields the AI may or may not return
  conflicts?: ContractAnalysis["conflicts"];
  counterProposalDraft?: string | null;
  playbookDeviations?: ContractAnalysis["playbookDeviations"];
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

    // ── Parallelize: auth + file download + business name lookup ───────────────
    const [{ business }, fileBuffer] = await Promise.all([
      requireBusinessAccess(businessId),
      fileBase64
        ? Promise.resolve(Buffer.from(fileBase64, "base64"))
        : fetchWithRetry(fileUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
    ]);

    const bizName = business.businessName ?? "the business owner";

    // ── AI analysis ───────────────────────────────────────────────────────────
    let ai: ContractAIResult;

    if (isImageMimeType(normalizedMime)) {
      const visionResult = await analyzeImageWithGroqVision<ContractAIResult>(
        buildVisionPrompt(bizName),
        fileBuffer,
        normalizedMime
      );
      if (visionResult) {
        ai = visionResult;
      } else {
        const contractText = await extractDocumentText(fileBuffer, normalizedMime, {
          minCharacters: 50,
          preferOcr: true,
        });
        ai = await generatePreferredJSON<ContractAIResult>(
          buildPrompt(limitContractText(contractText), bizName)
        );
      }
    } else {
      const contractText = await extractDocumentText(fileBuffer, normalizedMime, {
        minCharacters: 50,
        preferOcr: false,
      });
      ai = await generatePreferredJSON<ContractAIResult>(
        buildPrompt(limitContractText(contractText), bizName)
      );
    }

    // ── Persist ───────────────────────────────────────────────────────────────
    const now = new Date();
    let status: Contract["status"] = "active";
    if (ai.expirationDate) {
      const days = Math.ceil((new Date(ai.expirationDate).getTime() - now.getTime()) / 86400000);
      if (days < 0) status = "expired";
      else if (days <= 30) status = "expiring_soon";
    }

    const obligations: ContractObligation[] = (ai.obligations ?? []).map((o, i) => ({
      ...o,
      clauseRef: "",
      triggerDescription: "",
      monitoredField: null,
      monitoredThreshold: null,
      notes: null,
      id: `obl_${Date.now()}_${i}`,
      lastChecked: now.toISOString(),
    }));

    const analysisPayload = JSON.parse(
      JSON.stringify({
        summary: ai.summary,
        riskLevel: ai.riskLevel,
        clauses: ai.clauses ?? [],
        missingProtections: ai.missingProtections ?? [],
        conflicts: ai.conflicts ?? [],
        recommendations: ai.recommendations ?? [],
        estimatedAnnualCost: ai.estimatedAnnualCost,
        counterProposalDraft: ai.counterProposalDraft ?? null,
        playbookDeviations: ai.playbookDeviations ?? [],
      })
    );
    const obligationsPayload = JSON.parse(JSON.stringify(obligations));

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
        analysis: analysisPayload,
        obligations: obligationsPayload,
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
