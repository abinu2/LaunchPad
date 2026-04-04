/**
 * POST /api/ai/analyze-receipt
 *
 * Downloads a receipt image/PDF from storage, sends it to Gemini
 * as inline data, and returns structured expense data for the receipt.
 *
 * Body: { fileUrl, fileMimeType, businessId }
 * Returns: structured receipt fields ready to save to DB
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { fetchWithRetry } from "@/lib/fetch-file";
import { generateJSONWithFile, DEFAULT_MODEL } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

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
    const { fileUrl, fileMimeType, businessId } = await req.json();

    if (!fileUrl || !businessId) {
      return NextResponse.json({ error: "fileUrl and businessId are required" }, { status: 400 });
    }

    const mimeType = fileMimeType === "image/jpg" ? "image/jpeg" : fileMimeType;
    if (!mimeType || !SUPPORTED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${fileMimeType}. Use PDF, JPEG, PNG, or WEBP.` },
        { status: 415 }
      );
    }

    await requireBusinessAccess(businessId);

    // Fetch business profile for context
    const biz = await prisma.business.findUnique({ where: { id: businessId } });

    const fileRes = await fetchWithRetry(fileUrl);
    const fileBuffer = await fileRes.arrayBuffer();
    const fileBase64 = Buffer.from(fileBuffer).toString("base64");

    const serviceTypes =
      biz && Array.isArray(biz.serviceTypes) ? (biz.serviceTypes as { name?: string }[]) : [];

    const businessContext = biz
      ? `Business: ${biz.businessName} (${biz.businessType}), Entity: ${biz.entityType}, Services: ${serviceTypes.map((s) => s.name).filter(Boolean).join(", ") || "general"}`
      : "Business context unavailable";

    const prompt = `You are an expert bookkeeper and tax advisor for a small business. Analyze this receipt or expense document.

${businessContext}

Extract ALL data from the receipt and return ONLY a JSON object with this exact structure — no markdown, no explanation:

{
  "vendor": "Business or merchant name",
  "amount": total_amount_as_number,
  "date": "YYYY-MM-DD",
  "lineItems": [
    {
      "description": "item description",
      "quantity": number,
      "unitPrice": number,
      "totalPrice": number
    }
  ],
  "category": one of ["supplies", "vehicle_fuel", "vehicle_maintenance", "insurance", "rent", "utilities", "marketing", "equipment", "professional_services", "meals_entertainment", "office_supplies", "software", "training", "other"],
  "taxClassification": one of ["cogs", "expense", "asset", "personal", "mixed"],
  "businessPercentage": number_0_to_100,
  "deductibleAmount": number,
  "taxNotes": "Brief explanation of tax treatment",
  "associatedMileage": number_or_null,
  "needsMoreInfo": true_or_false,
  "pendingQuestion": "Question to ask business owner if unclear, or null"
}

CLASSIFICATION RULES:
- "cogs": Direct cost of providing services (materials, subcontractors)
- "expense": Operating expense (office supplies, software, meals, professional services)
- "asset": Equipment/property >$2,500 that lasts >1 year (consider Section 179)
- "personal": Purely personal, non-deductible
- "mixed": Has both business and personal use — adjust businessPercentage accordingly

SPECIFIC RULES:
- Gas/fuel for business vehicle: category="vehicle_fuel", businessPercentage based on business use
- Restaurant receipts: category="meals_entertainment", taxClassification="expense", businessPercentage=50 if business meal (only 50% deductible)
- Software subscriptions used for business: category="software", businessPercentage=100
- Office supplies/Amazon purchases: check if business-related, set businessPercentage accordingly
- Phone bill: category="utilities", businessPercentage=50-80 (mixed personal/business)
- Home internet if used for business: category="utilities", businessPercentage=50
- Tools/equipment under $2,500: category="equipment", taxClassification="expense" (Section 179 may apply)
- Tools/equipment over $2,500: taxClassification="asset"
- associatedMileage: only set if receipt relates to mileage (e.g., a mileage log or vehicle expense)
- needsMoreInfo: set true if business purpose is unclear, amount seems unusually large, or mixed use needs clarification
- deductibleAmount: amount × (businessPercentage / 100) × deductibility_factor (meals = 50%)

Return ONLY the JSON object.`;

    const result = await generateJSONWithFile<{
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
    }>(prompt, { data: fileBase64, mimeType }, DEFAULT_MODEL);

    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze-receipt error:", err);
    const message = err instanceof Error ? err.message : "Receipt analysis failed";
    const isConfig =
      message.includes("API_KEY") ||
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.includes("Unauthorized") ||
      message.includes("Forbidden");
    return NextResponse.json(
      { error: isConfig ? message : "Receipt analysis failed - please try again" },
      { status: 500 }
    );
  }
}
