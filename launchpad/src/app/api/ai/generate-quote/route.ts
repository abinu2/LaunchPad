import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/vertex-ai";

interface QuoteAnalysisRequest {
  services: { serviceName: string; unitPrice: number; quantity: number; supplyCost: number }[];
  vehicleType?: string;
  businessType: string;
  city: string;
  state: string;
  historicalAcceptanceRate?: number;
  totalQuotesSent?: number;
}

interface PricingAnalysis {
  supplyCost: number;
  estimatedLaborHours: number;
  estimatedLaborCost: number;
  profitMargin: number;
  marketComparison: string;
  recommendation: string;
  suggestedPrice: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: QuoteAnalysisRequest = await req.json();
    const totalPrice = body.services.reduce((s, svc) => s + svc.unitPrice * svc.quantity, 0);
    const totalSupplyCost = body.services.reduce((s, svc) => s + svc.supplyCost * svc.quantity, 0);

    const prompt = `
You are a pricing analyst for small service businesses. Analyze this quote and provide pricing recommendations.

BUSINESS: ${body.businessType} in ${body.city}, ${body.state}
SERVICES QUOTED:
${body.services.map((s) => `- ${s.serviceName}: $${s.unitPrice} x${s.quantity} (supply cost: $${s.supplyCost})`).join("\n")}
${body.vehicleType ? `VEHICLE TYPE: ${body.vehicleType}` : ""}
TOTAL QUOTED PRICE: $${totalPrice}
TOTAL SUPPLY COST: $${totalSupplyCost}
${body.historicalAcceptanceRate !== undefined ? `HISTORICAL ACCEPTANCE RATE: ${Math.round(body.historicalAcceptanceRate * 100)}% (from ${body.totalQuotesSent ?? 0} quotes sent)` : ""}

Return a JSON object:
{
  "supplyCost": number,
  "estimatedLaborHours": number,
  "estimatedLaborCost": number (assume $25/hr target labor rate),
  "profitMargin": number (percentage after supply + labor),
  "marketComparison": "string describing how this price compares to market in this metro area",
  "recommendation": "string — specific advice on whether to raise/lower/keep price, referencing their acceptance rate if provided",
  "suggestedPrice": number
}`;

    const result = await generateJSON<PricingAnalysis>(prompt);
    return NextResponse.json(result);
  } catch (err) {
    console.error("generate-quote error:", err);
    return NextResponse.json({ error: "Pricing analysis failed" }, { status: 500 });
  }
}
