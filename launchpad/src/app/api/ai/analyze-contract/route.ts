/**
 * POST /api/ai/analyze-contract
 *
 * Body:
 *   fileUrl      - Azure Blob Storage public URL of the uploaded contract
 *   fileName     - original filename
 *   fileType     - "pdf" | "docx" | "image"
 *   fileMimeType - exact MIME type (for example "application/pdf" or "image/jpeg")
 *   businessId   - Prisma business ID
 *
 * Flow:
 *   1. Download the contract file from Azure
 *   2. Fetch existing contracts for cross-contract conflict detection
 *   3. Fetch business profile for context
 *   4. Send file bytes + context to Gemini as inline data
 *   5. Parse structured JSON response
 *   6. Persist the contract record with Prisma
 *   7. Return the saved contract with its new ID
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { generateJSONWithFile, LONG_CONTEXT_MODEL } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";
import { serializeContract } from "@/lib/serializers";
import type { Prisma } from "@prisma/client";
import type { Contract, ContractAnalysis, ContractObligation } from "@/types/contract";

export const maxDuration = 120;

function buildPrompt(
  fileType: string,
  businessContext: string,
  existingContractSummaries: string
): string {
  const fileNote =
    fileType === "image"
      ? "The contract is provided as an image. Read all visible text in the image carefully."
      : "The contract is provided as a PDF document. Read and analyze all pages.";

  return `
You are an expert business attorney reviewing a contract on behalf of a small business owner.
The business owner is NOT legally sophisticated - explain everything in plain English while being legally precise.

${businessContext}

EXISTING CONTRACTS IN VAULT (for conflict detection):
${existingContractSummaries || "None yet."}

CONTRACT TO ANALYZE:
${fileNote}

Analyze this contract thoroughly and return a single JSON object with EXACTLY this structure.
Do not include any text outside the JSON.

{
  "summary": "2-3 sentence plain English summary of what this contract is and what it means for the business",
  "contractType": "service_agreement|vendor_agreement|lease|partnership|employment|financing|other",
  "counterpartyName": "Name of the other party",
  "effectiveDate": "YYYY-MM-DD or null",
  "expirationDate": "YYYY-MM-DD or null",
  "autoRenews": true|false,
  "autoRenewalDate": "YYYY-MM-DD or null - the date auto-renewal triggers",
  "autoRenewalNoticePeriod": number_or_null,
  "terminationNoticePeriod": number_or_null,
  "totalValue": number_or_null,
  "monthlyValue": number_or_null,
  "healthScore": number_0_to_100,
  "riskLevel": "low|medium|high|critical",
  "clauses": [
    {
      "clauseNumber": "e.g. 7.3",
      "clauseTitle": "e.g. Revenue Sharing",
      "originalText": "Exact verbatim text of the clause",
      "plainEnglish": "What this means in plain English, with dollar impact if applicable",
      "riskLevel": "safe|caution|danger",
      "issue": "What is wrong with this clause, or null if safe",
      "recommendation": "What to do about it, or null if safe",
      "businessImpact": "Dollar or operational impact estimate, or null",
      "playbookClause": "The standard/preferred language for this clause type, or null"
    }
  ],
  "missingProtections": [
    "Description of a protection this contract should have but doesn't"
  ],
  "conflicts": [
    {
      "thisClause": "Clause reference in this contract",
      "conflictingContractId": "ID from existing contracts list",
      "conflictingContractName": "Name of the conflicting contract",
      "conflictingClause": "Clause reference in the other contract",
      "description": "Plain English description of the conflict",
      "recommendation": "How to resolve it"
    }
  ],
  "recommendations": [
    "High-level recommendation specific to this business's situation"
  ],
  "estimatedAnnualCost": number_or_null,
  "counterProposalDraft": "Complete redlined counter-proposal in professional legal language, or null if no changes needed",
  "playbookDeviations": [
    {
      "clauseTitle": "Clause name",
      "currentLanguage": "What the contract currently says",
      "playbookLanguage": "What it should say",
      "reason": "Why the change matters"
    }
  ],
  "obligations": [
    {
      "clauseRef": "Clause number/title",
      "description": "What must be done",
      "party": "business|counterparty",
      "triggerType": "date|event|threshold|recurring",
      "triggerDescription": "When/what triggers this obligation",
      "dueDate": "YYYY-MM-DD or null",
      "recurringFrequency": "daily|weekly|monthly|quarterly|annual|null",
      "status": "pending",
      "monitoredField": null,
      "monitoredThreshold": null,
      "notes": null
    }
  ]
}

ANALYSIS RULES - apply all of these:
- Calculate DOLLAR IMPACT of every problematic clause against the business's actual financials
- Flag any non-compete clause - analyze geographic/temporal scope vs. actual operating area
- Flag any personal guarantee language that pierces LLC protection
- Flag auto-renewal terms - calculate cost of missing the cancellation window
- Check insurance requirements in the contract vs. business's current coverage
- Flag one-sided indemnification clauses
- Check termination notice requirements for both parties
- Flag unenforceable clauses under state law (for example overly broad non-competes)
- healthScore: 90-100 = clean, 70-89 = minor issues, 50-69 = significant issues, below 50 = major problems
- counterProposalDraft: use professional legal language - the owner will send this to the counterparty
- Always include obligations for: payment terms, notice requirements, renewal/termination deadlines, insurance maintenance, reporting requirements
`;
}

const SUPPORTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, fileName, fileType, fileMimeType, businessId } = await req.json();

    if (!fileUrl || !businessId) {
      return NextResponse.json({ error: "fileUrl and businessId are required" }, { status: 400 });
    }

    if (fileType === "docx") {
      return NextResponse.json(
        { error: "DOCX files cannot be analyzed directly. Please convert your contract to PDF and re-upload." },
        { status: 415 }
      );
    }

    const normalizedMimeType = fileMimeType === "image/jpg" ? "image/jpeg" : fileMimeType;
    const mimeType =
      normalizedMimeType ??
      (fileType === "pdf" ? "application/pdf" : fileType === "image" ? "image/jpeg" : null);

    if (!mimeType || !SUPPORTED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type for Gemini analysis: ${fileMimeType ?? fileType}` },
        { status: 415 }
      );
    }

    await requireBusinessAccess(businessId);

    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to fetch contract file (${fileRes.status})`);
    }

    const fileBuffer = await fileRes.arrayBuffer();
    const fileBase64 = Buffer.from(fileBuffer).toString("base64");

    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    const serviceTypes =
      biz && Array.isArray(biz.serviceTypes) ? (biz.serviceTypes as { name?: string }[]) : [];

    const businessContext = biz
      ? `BUSINESS CONTEXT:
- Business: ${biz.businessName} (${biz.businessType})
- Entity: ${biz.entityType} in ${biz.entityState}
- Owner: ${biz.ownerName}
- Monthly revenue: $${biz.monthlyRevenueAvg ?? 0}
- Services: ${serviceTypes.map((s) => s.name).filter(Boolean).join(", ") || "n/a"}
- Uses personal vehicle: ${biz.usesPersonalVehicle}
- Has employees: ${biz.hasEmployees}`
      : "BUSINESS CONTEXT: Not available.";

    const existingContracts = await prisma.contract.findMany({
      where: { businessId, status: { in: ["active", "expiring_soon"] } },
    });

    const existingContractSummaries = existingContracts
      .map((c: { id: string; counterpartyName: string; contractType: string; analysis: unknown }) => {
        const analysis = (c.analysis ?? {}) as { summary?: string };
        return `ID: ${c.id} | ${c.counterpartyName} (${c.contractType}) | Key terms: ${analysis.summary ?? "N/A"}`;
      })
      .join("\n");

    const prompt = buildPrompt(fileType, businessContext, existingContractSummaries);
    const ai = await generateJSONWithFile<{
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
    }>(prompt, { data: fileBase64, mimeType }, LONG_CONTEXT_MODEL);

    const now = new Date();
    let status: Contract["status"] = "active";
    if (ai.expirationDate) {
      const exp = new Date(ai.expirationDate);
      const daysUntilExp = Math.ceil((exp.getTime() - now.getTime()) / 86400000);
      if (daysUntilExp < 0) status = "expired";
      else if (daysUntilExp <= 30) status = "expiring_soon";
    }

    const obligations: ContractObligation[] = (ai.obligations ?? []).map((o, i) => ({
      ...o,
      id: `obl_${Date.now()}_${i}`,
      lastChecked: new Date().toISOString(),
    }));

    const contract = await prisma.contract.create({
      data: {
        businessId,
        fileName: fileName ?? "contract",
        fileUrl,
        fileType: fileType ?? "pdf",
        contractType: ai.contractType,
        counterpartyName: ai.counterpartyName,
        effectiveDate: ai.effectiveDate,
        expirationDate: ai.expirationDate,
        autoRenews: ai.autoRenews,
        autoRenewalDate: ai.autoRenewalDate,
        autoRenewalNoticePeriod: ai.autoRenewalNoticePeriod,
        terminationNoticePeriod: ai.terminationNoticePeriod,
        totalValue: ai.totalValue,
        monthlyValue: ai.monthlyValue,
        healthScore: ai.healthScore,
        status,
        analysis: {
          summary: ai.summary,
          riskLevel: ai.riskLevel,
          clauses: ai.clauses,
          missingProtections: ai.missingProtections,
          conflicts: ai.conflicts,
          recommendations: ai.recommendations,
          estimatedAnnualCost: ai.estimatedAnnualCost,
          counterProposalDraft: ai.counterProposalDraft,
          playbookDeviations: ai.playbookDeviations,
        } as unknown as Prisma.InputJsonValue,
        obligations: obligations as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(serializeContract(contract));
  } catch (err) {
    console.error("analyze-contract error:", err);
    return NextResponse.json({ error: "Contract analysis failed" }, { status: 500 });
  }
}
