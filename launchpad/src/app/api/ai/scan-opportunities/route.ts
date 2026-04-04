/**
 * POST /api/ai/scan-opportunities
 * Scans for funding opportunities, pricing optimizations, and expense reductions
 * specific to this business. Persists results to Firestore.
 *
 * Body: { businessId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { groqJSON, isGroqConfigured } from "@/lib/groq";
import { generateJSON } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client/index.js";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";
export const maxDuration = 10;

interface FundingOpportunityRaw {
  name: string;
  provider: string;
  type: "grant" | "microloan" | "line_of_credit" | "sba_loan" | "competition" | "other";
  amount: { min: number; max: number };
  interestRate: string | null;
  repaymentTerms: string | null;
  eligibilityMatch: number;
  eligibilityCriteria: { criterion: string; met: boolean; notes: string }[];
  applicationUrl: string;
  applicationDeadline: string | null;
  fitScore: number;
  recommendation: string;
  estimatedTimeToApply: string;
}

interface PricingRecommendation {
  serviceId: string;
  serviceName: string;
  currentPrice: number;
  suggestedPrice: number;
  reasoning: string;
  estimatedAnnualImpact: number;
  acceptanceRate: number | null;
}

interface ExpenseSaving {
  category: string;
  description: string;
  estimatedAnnualSaving: number;
  action: string;
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

    await requireBusinessAccess(businessId);
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // Check if Groq is configured
    if (!isGroqConfigured()) {
      console.warn("Groq API not configured - scan-opportunities requires Groq");
      return NextResponse.json({ 
        error: "Scan not available - Groq API not configured",
        fundingCount: 0,
        pricingCount: 0,
        expenseCount: 0,
      }, { status: 400 });
    }

    const businessAddress = (biz.businessAddress ?? {}) as { city?: string; county?: string };
    const serviceTypes = Array.isArray(biz.serviceTypes)
      ? (biz.serviceTypes as { name?: string; basePrice?: number }[])
      : [];

    const quotes = await prisma.quote.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const sentCount = quotes.filter((q: { status: string }) => ["sent", "viewed", "accepted", "declined", "paid"].includes(q.status)).length;
    const acceptedCount = quotes.filter((q: { status: string }) => ["accepted", "paid"].includes(q.status)).length;
    const acceptanceRate = sentCount > 0 ? Math.round((acceptedCount / sentCount) * 100) : null;

    // Fetch receipts for expense analysis
    const receipts = await prisma.receipt.findMany({
      where: { businessId },
      orderBy: { date: "desc" },
      take: 100,
    });
    const expenseByCategory: Record<string, number> = {};
    receipts.forEach((r: { category: string; amount: number | null }) => {
      expenseByCategory[r.category] = (expenseByCategory[r.category] ?? 0) + (r.amount ?? 0);
    });

    const annualRevenue = (biz.monthlyRevenueAvg ?? 0) * 12;
    const monthsOperating = biz.formationDate
      ? Math.floor((Date.now() - new Date(biz.formationDate).getTime()) / (30 * 86400000))
      : 0;

    const prompt = `
You are a small business growth advisor. Given this business profile, identify ALL currently available funding opportunities and growth recommendations.

BUSINESS PROFILE:
- Name: ${biz.businessName}
- Type: ${biz.businessType}
- Entity: ${biz.entityType} in ${biz.entityState}
- City: ${businessAddress.city ?? ""}, County: ${businessAddress.county ?? ""}
- Annual revenue: $${annualRevenue}
- Monthly revenue avg: $${biz.monthlyRevenueAvg ?? 0}
- Months operating: ${monthsOperating}
- Has employees: ${biz.hasEmployees}
- Is minority/woman/veteran owned: unknown (assume eligible for general programs)
- Quote acceptance rate: ${acceptanceRate !== null ? acceptanceRate + "%" : "unknown"}
- Services: ${serviceTypes.map((s) => `${s.name ?? "Service"} ($${s.basePrice ?? 0})`).join(", ")}
- Top expense categories: ${Object.entries(expenseByCategory).sort(([,a],[,b]) => b-a).slice(0,5).map(([k,v]) => `${k}: $${Math.round(v)}`).join(", ")}

TASK 1 — FUNDING OPPORTUNITIES:
Search for real, currently available funding opportunities this business qualifies for. Include:
1. Federal grants (SBA, USDA, minority business grants)
2. State grants (${biz.entityState} Commerce Authority, economic development)
3. County/city grants (${businessAddress.county ?? ""} County, City of ${businessAddress.city ?? ""})
4. Microloans (Kiva, Grameen, Accion, local CDFIs)
5. SBA loans (7a, microloans, Community Advantage)
6. Business plan competitions in ${biz.entityState}

Only include opportunities the business has a realistic chance of qualifying for.
Set eligibilityMatch 0-100 based on how well they match.
Set fitScore 0-100 based on how good this is for their specific situation.

TASK 2 — PRICING RECOMMENDATIONS:
Based on the acceptance rate and market knowledge, recommend price adjustments.
If acceptance rate > 85%, prices are likely too low.
Compare against typical market rates for ${biz.businessType} in ${businessAddress.city ?? ""}.

TASK 3 — EXPENSE SAVINGS:
Identify 2-3 specific expense reduction opportunities based on their spending patterns.

Return a JSON object with this exact structure:
{
  "fundingOpportunities": [
    {
      "name": "string",
      "provider": "string",
      "type": "grant|microloan|line_of_credit|sba_loan|competition|other",
      "amount": { "min": number, "max": number },
      "interestRate": "string or null",
      "repaymentTerms": "string or null",
      "eligibilityMatch": number,
      "eligibilityCriteria": [{ "criterion": "string", "met": boolean, "notes": "string" }],
      "applicationUrl": "real URL",
      "applicationDeadline": "YYYY-MM-DD or null",
      "fitScore": number,
      "recommendation": "specific explanation of why this is a good fit",
      "estimatedTimeToApply": "e.g. 20 minutes with pre-filled data"
    }
  ],
  "pricingRecommendations": [
    {
      "serviceId": "string",
      "serviceName": "string",
      "currentPrice": number,
      "suggestedPrice": number,
      "reasoning": "string",
      "estimatedAnnualImpact": number,
      "acceptanceRate": number or null
    }
  ],
  "expenseSavings": [
    {
      "category": "string",
      "description": "string",
      "estimatedAnnualSaving": number,
      "action": "specific action to take"
    }
  ]
}`;

    const result = isGroqConfigured()
      ? await groqJSON<{
          fundingOpportunities: FundingOpportunityRaw[];
          pricingRecommendations: PricingRecommendation[];
          expenseSavings: ExpenseSaving[];
        }>(prompt)
      : await generateJSON<{
          fundingOpportunities: FundingOpportunityRaw[];
          pricingRecommendations: PricingRecommendation[];
          expenseSavings: ExpenseSaving[];
        }>(prompt);

    // Persist funding opportunities — replace existing discovered ones
    await prisma.fundingOpportunity.deleteMany({
      where: { businessId, status: "discovered" },
    });

    await prisma.fundingOpportunity.createMany({
      data: (result.fundingOpportunities ?? []).map((op) => ({
        businessId,
        name: op.name,
        provider: op.provider,
        type: op.type,
        amountMin: op.amount.min,
        amountMax: op.amount.max,
        interestRate: op.interestRate,
        repaymentTerms: op.repaymentTerms,
        eligibilityMatch: op.eligibilityMatch,
        eligibilityCriteria: op.eligibilityCriteria as unknown as Prisma.InputJsonValue,
        applicationUrl: op.applicationUrl,
        applicationDeadline: op.applicationDeadline,
        status: "discovered",
        applicationProgress: 0,
        prefilledFields: buildPrefilledFields(biz) as Prisma.InputJsonValue,
        fitScore: op.fitScore,
        recommendation: op.recommendation,
        estimatedTimeToApply: op.estimatedTimeToApply,
      })),
    });

    await prisma.growthAction.deleteMany({
      where: { businessId, type: { in: ["pricing", "expense"] } },
    });

    await prisma.growthAction.createMany({
      data: [
        ...(result.pricingRecommendations ?? []).map((rec) => ({
          businessId,
          type: "pricing",
          title: `Raise ${rec.serviceName} price from $${rec.currentPrice} to $${rec.suggestedPrice}`,
          impact: `+$${rec.estimatedAnnualImpact.toLocaleString()}/year`,
          reasoning: rec.reasoning,
          urgency: "medium",
          effort: "low",
          dismissed: false,
        })),
        ...(result.expenseSavings ?? []).map((saving) => ({
          businessId,
          type: "expense",
          title: saving.description,
          impact: `-$${saving.estimatedAnnualSaving.toLocaleString()}/year in ${saving.category}`,
          reasoning: saving.action,
          urgency: "low",
          effort: "medium",
          dismissed: false,
        })),
      ],
    });

    return NextResponse.json({
      fundingCount: result.fundingOpportunities?.length ?? 0,
      pricingCount: result.pricingRecommendations?.length ?? 0,
      expenseCount: result.expenseSavings?.length ?? 0,
    });
  } catch (err) {
    console.error("scan-opportunities error:", err);
    return NextResponse.json({ 
      error: "Scan failed - ensure Groq API is configured",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}

function buildPrefilledFields(biz: Record<string, unknown>): Record<string, string> {
  const address = biz.businessAddress as Record<string, string> | undefined;
  const monthlyRevenueAvg = Number(biz.monthlyRevenueAvg ?? 0);
  return {
    "Business Name": String(biz.businessName ?? ""),
    "Business Type": String(biz.businessType ?? ""),
    "Entity Type": String(biz.entityType ?? ""),
    "State": String(biz.entityState ?? ""),
    "City": String(address?.city ?? ""),
    "Owner Name": String(biz.ownerName ?? ""),
    "Owner Email": String(biz.ownerEmail ?? ""),
    "Annual Revenue": String((monthlyRevenueAvg * 12).toFixed(0)),
    "Employee Count": String(biz.employeeCount ?? 0),
  };
}
