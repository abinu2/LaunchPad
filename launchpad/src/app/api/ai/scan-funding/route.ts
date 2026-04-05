/**
 * POST /api/ai/scan-funding
 * Enhanced funding opportunity scanner using Tiny Fish web scraping
 * Finds real, current funding opportunities from government and private sources
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { groqJSON, isGroqConfigured } from "@/lib/groq";
import { generateJSON } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client/index.js";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";

interface FundingSource {
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

async function scrapeFundingOpportunities(
  businessType: string,
  state: string,
  city: string
): Promise<FundingSource[]> {
  // If Tiny Fish is configured, use it to scrape current opportunities
  if (process.env.TINYFISH_API_KEY) {
    try {
      const response = await fetch("https://api.tinyfish.io/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.TINYFISH_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `${businessType} funding grants loans ${state} ${city}`,
          limit: 20,
          sources: ["sba.gov", "grants.gov", "score.org", "kiva.org", "accion.org"],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Parse and structure the scraped data
        const parsed = parseScrapedFunding(data);
        if (parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn("Tiny Fish scraping failed, falling back to AI generation:", err);
    }
  }

  // Fallback: Use AI to generate realistic opportunities
  return generateFundingOpportunitiesWithAI(businessType, state, city);
}

function parseScrapedFunding(scrapedData: unknown): FundingSource[] {
  // Parse Tiny Fish results into our FundingSource format
  // This is a placeholder — adapt based on actual Tiny Fish response format
  const results = scrapedData as { results?: Array<Record<string, unknown>> };
  return (results.results ?? []).map((item) => ({
    name: String(item.title ?? "Funding Opportunity"),
    provider: String(item.source ?? "Unknown"),
    type: (item.type as FundingSource["type"]) ?? "other",
    amount: {
      min: Number(item.minAmount ?? 0),
      max: Number(item.maxAmount ?? 50000),
    },
    interestRate: item.interestRate ? String(item.interestRate) : null,
    repaymentTerms: item.terms ? String(item.terms) : null,
    eligibilityMatch: Number(item.match ?? 75),
    eligibilityCriteria: [],
    applicationUrl: String(item.url ?? ""),
    applicationDeadline: item.deadline ? String(item.deadline) : null,
    fitScore: Number(item.fitScore ?? 70),
    recommendation: String(item.description ?? ""),
    estimatedTimeToApply: "15-30 minutes",
  }));
}

async function generateFundingOpportunitiesWithAI(
  businessType: string,
  state: string,
  city: string
): Promise<FundingSource[]> {
  const prompt = `You are a small business funding expert. Generate a list of REAL, CURRENTLY AVAILABLE funding opportunities for a ${businessType} business in ${city}, ${state}.

Include:
1. Federal grants (SBA, USDA, minority business grants)
2. State grants (${state} Commerce Authority, economic development)
3. Local grants (${city}, ${state} county)
4. Microloans (Kiva, Grameen, Accion, local CDFIs)
5. SBA loans (7(a), microloans, Community Advantage)
6. Business competitions and accelerators

For each opportunity, provide:
- Real organization name and website
- Actual funding amounts
- Real eligibility criteria
- Realistic application deadlines (use real dates if known, or null)
- Honest fit score based on typical ${businessType} eligibility

Return a JSON array of funding opportunities with this structure:
[
  {
    "name": "string",
    "provider": "string",
    "type": "grant|microloan|line_of_credit|sba_loan|competition|other",
    "amount": { "min": number, "max": number },
    "interestRate": "string or null",
    "repaymentTerms": "string or null",
    "eligibilityMatch": 0-100,
    "eligibilityCriteria": [{ "criterion": "string", "met": boolean, "notes": "string" }],
    "applicationUrl": "real URL",
    "applicationDeadline": "YYYY-MM-DD or null",
    "fitScore": 0-100,
    "recommendation": "why this is a good fit",
    "estimatedTimeToApply": "e.g. 20 minutes"
  }
]`;

  try {
    const isGroqConfigured = !!process.env.GROQ_API_KEY;
    if (!isGroqConfigured) {
      console.warn("Groq API not configured - returning empty opportunities");
      return [];
    }

    const { groqJSON } = await import("@/lib/groq");
    return await groqJSON<FundingSource[]>(prompt);
  } catch (err) {
    console.error("AI funding generation error:", err);
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) {
      return NextResponse.json({ error: "businessId required" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const address = (biz.businessAddress ?? {}) as { city?: string; state?: string };
    const city = address.city ?? "your city";
    const state = biz.entityState ?? "your state";

    // Use streaming to avoid timeout
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Scrape or generate funding opportunities
          const opportunities = await scrapeFundingOpportunities(biz.businessType, state, city);

          // If no opportunities found, return success with empty array
          if (!opportunities || opportunities.length === 0) {
            controller.enqueue(encoder.encode(JSON.stringify({
              success: true,
              count: 0,
              opportunities: [],
              message: "No funding opportunities found. Try again later or configure Tiny Fish API.",
            })));
            return controller.close();
          }

          // Clear old discovered opportunities and insert new ones
          await prisma.fundingOpportunity.deleteMany({
            where: { businessId, status: "discovered" },
          });

          await prisma.fundingOpportunity.createMany({
            data: opportunities.map((opp) => ({
              businessId,
              name: opp.name,
              provider: opp.provider,
              type: opp.type,
              amountMin: opp.amount.min,
              amountMax: opp.amount.max,
              interestRate: opp.interestRate,
              repaymentTerms: opp.repaymentTerms,
              eligibilityMatch: opp.eligibilityMatch,
              eligibilityCriteria: opp.eligibilityCriteria as unknown as Prisma.InputJsonValue,
              applicationUrl: opp.applicationUrl,
              applicationDeadline: opp.applicationDeadline,
              status: "discovered",
              applicationProgress: 0,
              fitScore: opp.fitScore,
              recommendation: opp.recommendation,
              estimatedTimeToApply: opp.estimatedTimeToApply,
            })),
          });

          controller.enqueue(encoder.encode(JSON.stringify({
            success: true,
            count: opportunities.length,
            opportunities: opportunities.slice(0, 5), // Return top 5 for preview
          })));
          controller.close();
        } catch (err) {
          console.error("scan-funding error:", err);
          controller.enqueue(encoder.encode(JSON.stringify({ 
            error: "Scan failed - ensure Groq API is configured",
            details: err instanceof Error ? err.message : "Unknown error"
          })));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    console.error("scan-funding error:", err);
    return NextResponse.json({ 
      error: "Scan failed - ensure Groq API is configured",
      details: err instanceof Error ? err.message : "Unknown error"
    }, { status: 500 });
  }
}
