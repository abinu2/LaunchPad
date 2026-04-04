/**
 * POST /api/ai/generate-contract
 *
 * Optimized for Vercel Hobby plan (10 s limit).
 * Uses Groq (fast) to generate contract sections as JSON,
 * then assembles clean HTML on the server — no slow HTML generation.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { groqText, isGroqConfigured } from "@/lib/groq";
import { generateText, LONG_CONTEXT_MODEL } from "@/lib/vertex-ai";

export const maxDuration = 10;

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  service_agreement: "Service Agreement",
  vendor_agreement: "Vendor Agreement",
  nda: "Non-Disclosure Agreement",
  independent_contractor: "Independent Contractor Agreement",
  subcontractor_agreement: "Subcontractor Agreement",
  retainer_agreement: "Monthly Retainer Agreement",
  equipment_rental: "Equipment Rental Agreement",
  partnership_agreement: "Partnership Agreement",
};

function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 40px;color:#1a1a1a;line-height:1.7;font-size:14px}
  h1{text-align:center;font-size:20px;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px}
  .subtitle{text-align:center;color:#555;font-size:12px;margin-bottom:32px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin-top:28px;margin-bottom:8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  p{margin:8px 0}
  .sig-table{width:100%;border-collapse:collapse;margin-top:40px}
  .sig-table td{width:50%;padding:8px 16px;vertical-align:top}
  .sig-line{border-top:1px solid #333;margin-top:40px;margin-bottom:4px}
  .sig-label{font-size:11px;color:#555}
  @media print{body{margin:0;padding:20px}}
</style>
</head>
<body>${body}</body>
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

    const { business: biz } = await requireBusinessAccess(businessId);

    const serviceTypes = Array.isArray(biz.serviceTypes)
      ? (biz.serviceTypes as { name?: string }[])
      : [];

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    const customFieldsText = customFields
      ? Object.entries(customFields as Record<string, string>)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n")
      : "";

    const typeLabel = CONTRACT_TYPE_LABELS[contractType] ?? contractType;

    const prompt = `Draft a complete ${typeLabel} as clean HTML body content (no <html>/<head>/<body> tags, just the inner content).

PARTIES:
- Provider: ${biz.businessName} (${biz.entityType}, ${biz.entityState}), Owner: ${biz.ownerName}
- Client: ${clientName}${clientEmail ? ` <${clientEmail}>` : ""}
- Date: ${today}

BUSINESS: ${biz.businessType}, Services: ${serviceTypes.map((s) => s.name).filter(Boolean).join(", ") || "professional services"}

${customFieldsText ? `TERMS:\n${customFieldsText}` : ""}

Requirements:
- Use <h1> for title, <h2> for sections, <p> for body
- Include: Parties, Scope, Payment (net-15, 1.5%/month late fee), Cancellation (24h notice, 50% fee), Limitation of Liability (capped at contract value), Indemnification, Dispute Resolution (mediation first), Termination (30-day notice), Governing Law (${biz.entityState}), Entire Agreement
- End with a signature table: <table class="sig-table"><tr><td><div class="sig-line"></div><div class="sig-label">Provider: ${biz.businessName}</div><div class="sig-label">Date: ___________</div></td><td><div class="sig-line"></div><div class="sig-label">Client: ${clientName}</div><div class="sig-label">Date: ___________</div></td></tr></table>
- Plain English, legally valid, protect the provider
- Return ONLY the HTML content, no markdown`;

    const rawHtml = isGroqConfigured()
      ? await groqText(prompt)
      : await generateText(prompt, LONG_CONTEXT_MODEL);

    // Strip any accidental markdown fences
    const bodyHtml = rawHtml
      .replace(/^```(?:html)?\n?/m, "")
      .replace(/\n?```$/m, "")
      .trim();

    const fullHtml = wrapHtml(`${typeLabel} - ${clientName}`, bodyHtml);

    return NextResponse.json({ html: fullHtml, contractType, clientName });
  } catch (err) {
    console.error("generate-contract error:", err);
    return NextResponse.json({ error: "Contract generation failed" }, { status: 500 });
  }
}
