/**
 * POST /api/ai/analyze-receipt
 *
 * Optimized for Vercel Hobby plan (10 s limit).
 * Images → Groq vision one-shot (~2-4 s)
 * PDFs   → pdf-parse + Groq text  (~3-6 s)
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import {
  analyzeImageWithGroqVision,
  extractDocumentText,
  isSupportedDocumentMimeType,
  isImageMimeType,
  normalizeDocumentMimeType,
  generatePreferredJSON,
} from "@/lib/document-ai";
import { fetchWithRetry } from "@/lib/fetch-file";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const RECEIPT_SCHEMA = `{
  "vendor":"string","amount":number,"date":"YYYY-MM-DD",
  "lineItems":[{"description":"","quantity":number,"unitPrice":number,"totalPrice":number}],
  "category":"supplies|vehicle_fuel|vehicle_maintenance|insurance|rent|utilities|marketing|equipment|professional_services|meals_entertainment|office_supplies|software|training|other",
  "taxClassification":"cogs|expense|asset|personal|mixed",
  "businessPercentage":0-100,"deductibleAmount":number,
  "taxNotes":"brief explanation",
  "associatedMileage":number|null,
  "needsMoreInfo":boolean,"pendingQuestion":"string|null"
}`;

const RULES = `Gas→vehicle_fuel. Restaurant→meals_entertainment,businessPercentage=50. Phone/internet→utilities,50-80%. deductibleAmount=amount×(businessPercentage/100).`;

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

    // Parallelize auth + file download + business lookup
    const [{ business }, fileBuffer] = await Promise.all([
      requireBusinessAccess(businessId),
      fileBase64
        ? Promise.resolve(Buffer.from(fileBase64, "base64"))
        : fetchWithRetry(fileUrl!).then((r) => r.arrayBuffer()).then((ab) => Buffer.from(ab)),
    ]);

    const bizCtx = business ? `${business.businessName} (${business.businessType})` : "small business";

    // Image → Groq vision one-shot
    if (isImageMimeType(mimeType)) {
      const visionResult = await analyzeImageWithGroqVision<ReceiptResult>(
        `You are a bookkeeper. Analyze this receipt for ${bizCtx}. Return ONLY JSON:\n${RECEIPT_SCHEMA}\n${RULES}`,
        fileBuffer,
        mimeType
      );
      if (visionResult) return NextResponse.json(visionResult);
    }

    // PDF or vision fallback → extract text then analyze
    const text = await extractDocumentText(fileBuffer, mimeType, {
      minCharacters: 10,
      preferOcr: false,
    });

    const result = await generatePreferredJSON<ReceiptResult>(
      `You are a bookkeeper. Analyze this receipt for ${bizCtx}.\n\nTEXT:\n${text}\n\nReturn ONLY JSON:\n${RECEIPT_SCHEMA}\n${RULES}`
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze-receipt error:", err);
    const message = err instanceof Error ? err.message : "Receipt analysis failed";
    const isConfig =
      message.includes("API_KEY") || message.includes("GROQ_API_KEY") || message.includes("GEMINI_API_KEY");
    return NextResponse.json(
      { error: isConfig ? message : "Receipt analysis failed — please try again" },
      { status: 500 }
    );
  }
}
