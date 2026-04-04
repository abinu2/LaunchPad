/**
 * POST /api/ai/analyze-receipt
 *
 * Fast path (preferred): client sends { fileBase64, fileMimeType, businessId }
 *   → Groq vision does OCR + analysis in ONE call (~1–2s)
 *
 * Fallback: client sends { fileUrl, fileMimeType, businessId }
 *   → API downloads from blob → extracts text → Groq/Gemini analysis
 *
 * Returns structured receipt JSON without saving — the client saves via addReceipt().
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import {
  analyzeImageWithGroqVision,
  extractDocumentText,
  isSupportedDocumentMimeType,
  isImageMimeType,
  normalizeDocumentMimeType,
} from "@/lib/document-ai";
import { generatePreferredJSON } from "@/lib/document-ai";
import { fetchWithRetry } from "@/lib/fetch-file";
import { prisma } from "@/lib/prisma";

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
- Gas/fuel → category=vehicle_fuel
- Restaurant → category=meals_entertainment, businessPercentage=50 (only 50% deductible under IRS rules)
- Phone/internet → category=utilities, businessPercentage=50–80
- deductibleAmount = amount × (businessPercentage/100) × deductibility_factor`;

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
    const body = await req.json() as {
      fileBase64?: string;
      fileUrl?: string;
      fileMimeType?: string;
      businessId?: string;
    };

    const { fileBase64, fileUrl, businessId } = body;
    const fileMimeType = body.fileMimeType ?? "";

    if (!businessId || (!fileBase64 && !fileUrl)) {
      return NextResponse.json(
        { error: "businessId and either fileBase64 or fileUrl are required" },
        { status: 400 }
      );
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

    // ── Resolve file buffer ───────────────────────────────────────────────────
    let fileBuffer: Buffer;
    if (fileBase64) {
      fileBuffer = Buffer.from(fileBase64, "base64");
    } else {
      const fileRes = await fetchWithRetry(fileUrl!);
      fileBuffer = Buffer.from(await fileRes.arrayBuffer());
    }

    // ── Fast path: Groq vision for images (OCR + analysis in one call) ────────
    if (isImageMimeType(mimeType)) {
      const visionPrompt = `You are an expert bookkeeper. Look at this receipt or expense document for a small business.

${businessContext}

Extract all visible information and return ONLY a JSON object matching this schema:
${RECEIPT_SCHEMA}

${RECEIPT_RULES}`;

      const visionResult = await analyzeImageWithGroqVision<ReceiptResult>(
        visionPrompt,
        fileBuffer,
        mimeType
      );

      if (visionResult) {
        return NextResponse.json(visionResult);
      }
      // If Groq vision not configured, fall through to text extraction path
    }

    // ── Text path: extract text then analyze ─────────────────────────────────
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

    const result = await generatePreferredJSON<ReceiptResult>(prompt);

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
      { error: isConfig ? message : "Receipt analysis failed — please try again" },
      { status: 500 }
    );
  }
}
