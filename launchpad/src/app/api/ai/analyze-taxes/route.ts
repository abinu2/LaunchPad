/**
 * POST /api/ai/analyze-taxes
 *
 * Sends the business's actual receipts and bank transactions to Gemini and
 * asks it to identify missed deductions, under-claimed expenses, and
 * personalised tax-saving actions.
 *
 * Body: { businessId: string }
 *
 * Returns: { missedDeductions, actionItems, totalEstimatedSavings, analysis }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { groqJSON, isGroqConfigured } from "@/lib/groq";
import { generateJSON, DEFAULT_MODEL } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";

export const maxDuration = 10;

export interface MissedDeduction {
  title: string;
  description: string;
  estimatedAnnualSavings: number;
  estimatedDeductionAmount: number;
  evidenceFromData: string;      // why Gemini flagged it
  howToClaim: string;
  irsForm: string | null;
  documentationNeeded: string[];
  priority: "high" | "medium" | "low";
  difficulty: "easy" | "moderate" | "complex";
}

export interface TaxAIResult {
  missedDeductions: MissedDeduction[];
  actionItems: { action: string; deadline: string | null; estimatedImpact: string }[];
  totalEstimatedSavings: number;
  entityAdvice: string | null;  // e.g. "consider S-Corp election"
  summary: string;
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) {
      return NextResponse.json({ error: "businessId required" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    const [biz, receipts, quotes, bankTxs] = await Promise.all([
      prisma.business.findUnique({ where: { id: businessId } }),
      prisma.receipt.findMany({ where: { businessId }, orderBy: { date: "desc" }, take: 200 }),
      prisma.quote.findMany({ where: { businessId, status: "paid" } }),
      prisma.bankTransaction.findMany({
        where: { businessId, pending: false },
        orderBy: { date: "desc" },
        take: 300,
      }),
    ]);

    if (!biz) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const serviceTypes = Array.isArray(biz.serviceTypes)
      ? (biz.serviceTypes as { name?: string }[])
      : [];

    const ytdRevenue = quotes.reduce(
      (sum: number, quote: (typeof quotes)[number]) => sum + quote.total,
      0
    );
    const ytdExpenses = receipts.reduce(
      (sum: number, receipt: (typeof receipts)[number]) =>
        sum + (receipt.deductibleAmount ?? receipt.amount),
      0
    );
    const ytdProfit = ytdRevenue - ytdExpenses;

    // Expense summary by category
    const expenseByCategory: Record<string, number> = {};
    for (const r of receipts) {
      expenseByCategory[r.category] = (expenseByCategory[r.category] ?? 0) + (r.deductibleAmount ?? r.amount);
    }

    const totalMiles = receipts.reduce(
      (s: number, r: (typeof receipts)[number]) => s + (r.associatedMileage ?? 0),
      0
    );

    // Sample of specific receipts for analysis
    const receiptSample = receipts.slice(0, 50).map((r: (typeof receipts)[number]) => ({
      vendor: r.vendor,
      amount: r.amount,
      category: r.category,
      date: r.date,
      taxClassification: r.taxClassification,
      businessPct: r.businessPercentage,
      mileage: r.associatedMileage,
      taxNotes: r.taxNotes || null,
    }));

    // Top bank transactions (debits)
    const topDebits = bankTxs
      .filter((t: (typeof bankTxs)[number]) => t.amount > 0)
      .sort((a: (typeof bankTxs)[number], b: (typeof bankTxs)[number]) => b.amount - a.amount)
      .slice(0, 30)
      .map((t: (typeof bankTxs)[number]) => ({
        name: t.merchantName ?? t.name,
        amount: t.amount,
        date: t.date,
        category: (t.personalFinanceCategory as { primary?: string } | null)?.primary ?? "unknown",
      }));

    const prompt = `
You are a CPA and small business tax strategist specializing in helping first-time entrepreneurs maximize their deductions.

BUSINESS PROFILE:
- Name: ${biz.businessName}
- Type: ${biz.businessType}
- Entity: ${biz.entityType} in ${biz.entityState}
- Services: ${serviceTypes.map((s) => s.name).filter(Boolean).join(", ") || "general services"}
- Uses personal vehicle: ${biz.usesPersonalVehicle}
- Has employees: ${biz.hasEmployees} (${biz.employeeCount} employees)
- Has contractors: ${biz.hasContractors}
- Is first-time business owner: ${biz.isFirstTimeBusiness}
- Has W-2 income from other job: ${biz.hasOtherJob} (estimated: $${biz.estimatedW2Income ?? 0})

CURRENT YEAR FINANCIALS:
- YTD Revenue: $${Math.round(ytdRevenue).toLocaleString()}
- YTD Expenses: $${Math.round(ytdExpenses).toLocaleString()}
- YTD Net Profit: $${Math.round(ytdProfit).toLocaleString()}
- Business miles tracked: ${totalMiles}

EXPENSE CATEGORIES (from receipt scanning):
${Object.entries(expenseByCategory)
  .sort(([, a], [, b]) => b - a)
  .map(([cat, amount]) => `- ${cat}: $${Math.round(amount)}`)
  .join("\n") || "No receipts scanned yet."}

SAMPLE RECEIPTS (last 50):
${JSON.stringify(receiptSample, null, 2)}

TOP BANK DEBITS:
${JSON.stringify(topDebits, null, 2)}

TASK: Analyze this business owner's actual financial data and identify:
1. Tax deductions they are likely MISSING or UNDER-CLAIMING based on what you see in the data
2. Expenses being mis-categorized (e.g., personal items that have business use, or business items not flagged)
3. Specific action items they should take before year-end
4. Entity structure advice if appropriate (e.g., S-Corp election)

Focus on ACTIONABLE insights derived from THEIR ACTUAL DATA — not generic advice.
Look for patterns like:
- Vehicle use not tracked (if usesPersonalVehicle but no mileage in receipts)
- Software/subscription tools not flagged as business deductions
- Home office potential (any "rent" or "utilities" in receipts)
- Meals that aren't flagged as business meals
- Phone/internet not being claimed
- Education expenses
- Professional development
- Tools/equipment that could qualify for Section 179
- Contractors paid without 1099 documentation
- Health insurance premiums not tracked

Return a JSON object with EXACTLY this structure:
{
  "summary": "2-3 sentence overview of the tax situation and biggest opportunities",
  "missedDeductions": [
    {
      "title": "Deduction name",
      "description": "What it is and why they qualify based on their data",
      "estimatedAnnualSavings": number_in_dollars,
      "estimatedDeductionAmount": number_in_dollars,
      "evidenceFromData": "Specific evidence from their receipts/transactions that triggered this flag",
      "howToClaim": "Step-by-step how to claim this deduction",
      "irsForm": "Schedule C, Form 8829, etc. or null",
      "documentationNeeded": ["list of records needed"],
      "priority": "high|medium|low",
      "difficulty": "easy|moderate|complex"
    }
  ],
  "actionItems": [
    {
      "action": "Specific thing to do",
      "deadline": "YYYY-MM-DD or null",
      "estimatedImpact": "Dollar amount or description of impact"
    }
  ],
  "totalEstimatedSavings": number,
  "entityAdvice": "Specific advice about their entity structure, or null if already optimal"
}

Tax rate assumptions: Combined self-employment + federal effective rate of ~30% for a sole proprietor/single-member LLC.
Return ONLY the JSON. No explanation, no markdown.
`;

    const result = isGroqConfigured()
      ? await groqJSON<TaxAIResult>(prompt)
      : await generateJSON<TaxAIResult>(prompt, DEFAULT_MODEL);

    return NextResponse.json(result);
  } catch (err) {
    console.error("analyze-taxes error:", err);
    return NextResponse.json({ error: "Tax analysis failed" }, { status: 500 });
  }
}
