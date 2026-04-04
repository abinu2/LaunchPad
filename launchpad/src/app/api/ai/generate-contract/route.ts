/**
 * POST /api/ai/generate-contract
 *
 * Generates a ready-to-sign contract from scratch based on business profile
 * and contract type. Returns HTML that can be rendered, printed, or downloaded.
 *
 * Body:
 *   businessId    - Prisma business ID
 *   contractType  - "service_agreement" | "vendor_agreement" | "nda" | "independent_contractor"
 *   clientName    - counterparty name
 *   clientEmail   - counterparty email (optional)
 *   customFields  - Record<string, string> of any extra fields to inject
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { generateText, LONG_CONTEXT_MODEL } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";

// Contract generation with a long-context model can take 30–90 seconds
export const maxDuration = 10;

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  service_agreement: "Service Agreement",
  vendor_agreement: "Vendor Agreement",
  nda: "Non-Disclosure Agreement",
  independent_contractor: "Independent Contractor Agreement",
};

function ensureHtmlDocument(html: string, title: string) {
  const trimmed = html.trim();
  if (/<!doctype html/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body>
    ${trimmed}
  </body>
</html>`;
}

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
- Write like a real lawyer-drafted agreement, not a memo or checklist
- Fill in party names, dates, and defined terms consistently throughout
- Include commercially realistic details, placeholders only where facts are truly missing
- If business details imply a service company, tailor scope, damage documentation, change-order, and payment default clauses for that kind of work
- Make signature blocks look formal and ready for printing
- Avoid markdown, bullet lists, or explanatory notes outside the contract itself

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
11. Dispute Resolution (mediation -> arbitration -> litigation)
12. Termination (30-day written notice)
13. Governing Law (${biz.entityState})
14. Severability
15. Entire Agreement
16. Signature Blocks (both parties, with date lines)

Format as clean HTML with:
- a full valid HTML document
- <h1> for the contract title
- <h2> for section headings
- <p> for body text
- <ol> or <ul> only if needed for defined obligations or payment steps
- <table> for signature blocks
- Inline styles for print-friendly formatting
- Professional document styling: white page background, Georgia or Times New Roman serif body, centered title, justified body text where appropriate, generous section spacing, borders only where useful
- Add a short introductory recital block before the numbered sections if appropriate
- Signature table must include printed names, titles, signature lines, and date lines for both parties

Return ONLY the HTML. No JSON wrapper, no markdown, no explanation.
`;

    const cleanHtml = ensureHtmlDocument(
      await generateText(prompt, LONG_CONTEXT_MODEL),
      `${CONTRACT_TYPE_LABELS[contractType] ?? contractType} - ${clientName}`
    );

    return NextResponse.json({ html: cleanHtml, contractType, clientName });
  } catch (err) {
    console.error("generate-contract error:", err);
    return NextResponse.json({ error: "Contract generation failed" }, { status: 500 });
  }
}
