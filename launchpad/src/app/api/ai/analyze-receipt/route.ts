/**
 * POST /api/ai/analyze-receipt
 *
 * Strategy:
 *   - Extract readable text from PDFs and images
 *   - Prefer Groq for structured text analysis
 *   - Use Gemini only as OCR fallback when the document itself does not yield enough text
 *
 * Body: { fileUrl, fileMimeType, businessId }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import {
  extractDocumentText,
  generatePreferredJSON,
  isSupportedDocumentMimeType,
  normalizeDocumentMimeType,
} from "@/lib/document-ai";
import { fetchWithRetry } from "@/lib/fetch-file";
import { prisma } from "@/lib/prisma";
import { DEFAULT_MODEL } from "@/lib/vertex-ai";

export const maxDuration = 60;

const RECEIPT_SCHEMA = `{
  "vendor": "Business or merchant name",
  "amount": number,
  "date": "YYYY-MM-DD",
  "lineItems": [{"description":"","quantity":number,"unitPrice":number,"totalPrice":number}],
  "category": "supplies|vehicle_fuel|vehicle_maintenance|insurance|rent|utilities|marketing|equipment|professional_services|meals_entertainment|office_supplies|software|training|other",
  "taxClassification": "cogs|expense|asset|personal|mixed",
  "businessPercentage": number 0-100,
  "deductibleAmount": number,
  "taxNotes": "Brief tax treatment explanation",
  "associatedMileage": number or null,
  "needsMoreInfo": true or false,
  "pendingQuestion": "string or null"
}`;

const RECEIPT_RULES = `RULES:
- cogs: direct cost of services (materials, subcontractors)
- expense: operating expense (supplies, software, meals, professional services)
- asset: equipment >$2,500 lasting >1 year
- personal: non-deductible
- mixed: both business and personal use
- Gas/fuel: category=vehicle_fuel
- Restaurant: category=meals_entertainment, businessPercentage=50 (only 50% deductible)
- Phone/internet: category=utilities, businessPercentage=50-80
- deductibleAmount = amount x (businessPercentage/100) x deductibility_factor`;

type ReceiptResult = {
  vendor: string;
  amount: number;
  date: string;
  lineItems: { description: string; quantity: number; unitPrice: number; totalPrice: number }[];
  category: string;
  taxClassification: string;
  businessPercentage: number;
  deductibleAmount: number;
  taxNotes: string;
  associatedMileage: number | null;
  needsMoreInfo: boolean;
  pendingQuestion: string | null;
};

export async function POST(req: NextRequest) {
  try {
    const { fileUrl, fileMimeType, businessId } = await req.json();

    if (!fileUrl || !businessId) {
      return NextResponse.json({ error: "fileUrl and businessId are required" }, { status: 400 });
    }

    const mimeType = normalizeDocumentMimeType(fileMimeType);

    if (!isSupportedDocumentMimeType(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileMimeType}. Use PDF, JPEG, PNG, or WEBP.` },
        { status: 415 }
      );
    }

    await requireBusinessAccess(businessId);

    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    const serviceTypes =
      biz && Array.isArray(biz.serviceTypes) ? (biz.serviceTypes as { name?: string }[]) : [];
    const businessContext = biz
      ? `Business: ${biz.businessName} (${biz.businessType}), Entity: ${biz.entityType}, Services: ${serviceTypes.map((s) => s.name).filter(Boolean).join(", ") || "general"}`
      : "Business context unavailable";

    const fileRes = await fetchWithRetry(fileUrl);
    const fileBuffer = Buffer.from(await fileRes.arrayBuffer());
    const receiptText = await extractDocumentText(fileBuffer, mimeType, {
      minCharacters: 10,
      preferOcr: false,
    });

    const prompt = `You are an expert bookkeeper. Analyze this receipt or expense document for a small business.

${businessContext}

RECEIPT TEXT:
${receiptText}

Return ONLY a JSON object matching this schema:
${RECEIPT_SCHEMA}

${RECEIPT_RULES}`;

    const result = await generatePreferredJSON<ReceiptResult>(prompt, {
      geminiModel: DEFAULT_MODEL,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze-receipt error:", err);
    const message = err instanceof Error ? err.message : "Receipt analysis failed";
    const isConfig =
      message.includes("API_KEY") ||
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.includes("GROQ_API_KEY") ||
      message.includes("GEMINI_API_KEY");
    return NextResponse.json(
      { error: isConfig ? message : "Receipt analysis failed - please try again" },
      { status: 500 }
    );
  }
}
