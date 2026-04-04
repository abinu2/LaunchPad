/**
 * POST /api/ai/generate-contract
 *
 * Generates a ready-to-sign contract from scratch based on business profile
 * and contract type. Returns HTML that can be rendered, printed, or downloaded.
 *
 * Body:
 *   businessId    – Firestore business ID
 *   contractType  – "service_agreement" | "vendor_agreement" | "nda" | "independent_contractor"
 *   clientName    – counterparty name
 *   clientEmail   – counterparty email (optional)
 *   customFields  – Record<string, string> of any extra fields to inject
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { getGeminiModel, LONG_CONTEXT_MODEL } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  service_agreement: "Service Agreement",
  vendor_agreement: "Vendor Agreement",
  nda: "Non-Disclosure Agreement",
  independent_contractor: "Independent Contractor Agreement",
};

export async function POST(req: NextRequest) {
  try {
    const { businessId, contractType, clientName, clientEmail, customFields } =
      await req.json();

    if (!businessId || !contractType || !clientName) {
      return NextResponse.json(
        { error: "businessId, contractType, and clientName are required" },
        { status: 400 }
      );
    }

    await requireBusinessAccess(businessId);
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    const serviceTypes = Array.isArray(biz.serviceTypes)
      ? (biz.serviceTypes as { name?: string }[])
      : [];

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const customFieldsText = customFields
      ? Object.entries(customFields as Record<string, string>)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "";

    const prompt = `
You are an expert business attorney drafting a ${CONTRACT_TYPE_LABELS[contractType] ?? contractType} for a ${biz.businessType} business in ${biz.entityState}.

BUSINESS DETAILS:
- Business name: ${biz.businessName}
- Entity type: ${biz.entityType}
- State: ${biz.entityState}
- Owner: ${biz.ownerName}
- Services: ${serviceTypes.map((s) => s.name).filter(Boolean).join(", ") || "professional services"}
- Uses personal vehicle: ${biz.usesPersonalVehicle}

CLIENT DETAILS:
- Client name: ${clientName}
- Client email: ${clientEmail ?? ""}

DATE: ${today}

${customFieldsText ? `ADDITIONAL DETAILS:\n${customFieldsText}` : ""}

Generate a complete, ready-to-sign ${CONTRACT_TYPE_LABELS[contractType] ?? contractType}.

REQUIREMENTS:
- Use clear, plain English while maintaining legal validity
- Protect the business owner (your client) while being fair and reasonable
- Include ALL standard protective clauses for a ${biz.businessType} business
- Include state-specific requirements for ${biz.entityState}
- For service businesses: include pre-existing damage documentation clause, cancellation policy, payment terms
- Limitation of liability capped at contract value
- Dispute resolution: mediation before litigation
- Governing law: ${biz.entityState}

REQUIRED SECTIONS (include all):
1. Parties and Definitions
2. Scope of Services
3. Pricing and Payment Terms (net-15, late fee of 1.5%/month)
4. Scheduling and Cancellation Policy (24-hour notice, 50% cancellation fee)
5. Limitation of Liability
6. Indemnification (mutual, proportional)
7. Insurance Requirements
8. Pre-Existing Conditions / Documentation Clause (if service business)
9. Intellectual Property (if applicable)
10. Confidentiality
11. Dispute Resolution (mediation → arbitration → litigation)
12. Termination (30-day written notice)
13. Governing Law (${biz.entityState})
14. Severability
15. Entire Agreement
16. Signature Blocks (both parties, with date lines)

Format as clean HTML with:
- <h1> for the contract title
- <h2> for section headings
- <p> for body text
- <table> for signature blocks
- Inline styles for print-friendly formatting (font-family: Georgia, serif; line-height: 1.6; max-width: 800px)

Return ONLY the HTML. No JSON wrapper, no markdown, no explanation.
`;

    const model = getGeminiModel(LONG_CONTEXT_MODEL);
    const result = await model.generateContent(prompt);
    const html =
      result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip any accidental markdown fences
    const cleanHtml = html
      .replace(/^```html?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();

    return NextResponse.json({ html: cleanHtml, contractType, clientName });
  } catch (err) {
    console.error("generate-contract error:", err);
    return NextResponse.json({ error: "Contract generation failed" }, { status: 500 });
  }
}
