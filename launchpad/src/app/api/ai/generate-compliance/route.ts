/**
 * POST /api/ai/generate-compliance
 * Generates a complete compliance checklist for a business using Gemini.
 * Called on onboarding and whenever the business profile changes materially
 * (e.g. first employee hired, new operating city added).
 *
 * Body: { businessId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { generateJSON } from "@/lib/vertex-ai";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface ComplianceItemRaw {
  title: string;
  description: string;
  jurisdiction: "federal" | "state" | "county" | "city";
  jurisdictionName: string;
  category: "license" | "registration" | "permit" | "tax_filing" | "insurance" | "report";
  isRequired: boolean;
  legalCitation: string | null;
  applicationUrl: string | null;
  cost: number | null;
  renewalFrequency: "monthly" | "quarterly" | "annual" | "biennial" | "one_time" | null;
  estimatedProcessingTime: string | null;
  documentationRequired: string[];
  penaltyForNonCompliance: string | null;
  daysUntilDue: number | null;
  expirationDate: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

    await requireBusinessAccess(businessId);
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const businessAddress = (biz.businessAddress ?? {}) as { county?: string; city?: string };
    const operatingJurisdictions = Array.isArray(biz.operatingJurisdictions) ? biz.operatingJurisdictions : [];

    const prompt = `
You are an expert in small business regulatory compliance. Given the following business profile, generate a COMPLETE and EXHAUSTIVE list of every federal, state, county, and city compliance requirement this business must meet.

BUSINESS PROFILE:
- Business name: ${biz.businessName}
- Business type: ${biz.businessType}
- Entity type: ${biz.entityType}
- State: ${biz.entityState}
- County: ${businessAddress.county ?? "unknown"}
- City: ${businessAddress.city ?? "unknown"}
- Has employees: ${biz.hasEmployees} (count: ${biz.employeeCount})
- Has contractors: ${biz.hasContractors}
- Uses personal vehicle for business: ${biz.usesPersonalVehicle}
- Estimated annual revenue: $${(biz.monthlyRevenueAvg ?? 0) * 12}
- NAICS code: ${biz.naicsCode}
- Operating jurisdictions: ${operatingJurisdictions.join(", ")}

BE EXHAUSTIVE. Include requirements that are easy to miss:
- Transaction Privilege Tax / sales tax registration and monthly filing
- Quarterly estimated federal and state tax payments
- Annual entity report/renewal filing
- Business personal property tax (if equipment over threshold)
- Workers compensation insurance (mandatory with first employee in most states)
- Commercial auto insurance (if using personal vehicle for business)
- General liability insurance (industry standard)
- Any industry-specific permits (e.g. wastewater for car washing, food handler for food businesses)
- New hire reporting (federal and state)
- I-9 verification (if employees)
- OSHA poster requirement (if employees)
- City/county business license
- State business license or registration
- EIN registration
- DBA/fictitious name registration (if operating under a name different from legal entity name)

For each requirement, set daysUntilDue based on typical renewal cycles:
- Monthly filings: 30 days
- Quarterly filings: 90 days
- Annual renewals: 365 days
- One-time items not yet obtained: 0 (immediate)

Return a JSON array of compliance items. Each item must match this exact structure:
[
  {
    "title": "string",
    "description": "string — what it is and why it's needed",
    "jurisdiction": "federal|state|county|city",
    "jurisdictionName": "e.g. City of Tempe, State of Arizona, IRS",
    "category": "license|registration|permit|tax_filing|insurance|report",
    "isRequired": true,
    "legalCitation": "specific statute or ordinance, or null",
    "applicationUrl": "direct URL to apply or file, or null",
    "cost": number or null,
    "renewalFrequency": "monthly|quarterly|annual|biennial|one_time|null",
    "estimatedProcessingTime": "e.g. 3-5 business days, or null",
    "documentationRequired": ["list of required documents"],
    "penaltyForNonCompliance": "specific penalty description, or null",
    "daysUntilDue": number or null,
    "expirationDate": "YYYY-MM-DD or null"
  }
]

Return ONLY the JSON array. No explanation, no markdown.`;

    const items = await generateJSON<ComplianceItemRaw[]>(prompt);

    await prisma.complianceItem.deleteMany({
      where: { businessId, status: "not_started" },
    });

    await prisma.complianceItem.createMany({
      data: items.map((item) => ({
        businessId,
        title: item.title,
        description: item.description,
        jurisdiction: item.jurisdiction,
        jurisdictionName: item.jurisdictionName,
        category: item.category,
        isRequired: item.isRequired,
        legalCitation: item.legalCitation,
        status: "not_started",
        obtainedDate: null,
        expirationDate: item.expirationDate,
        renewalDate: null,
        renewalFrequency: item.renewalFrequency,
        daysUntilDue: item.daysUntilDue,
        applicationUrl: item.applicationUrl,
        cost: item.cost,
        estimatedProcessingTime: item.estimatedProcessingTime,
        documentationRequired: item.documentationRequired as unknown as Prisma.InputJsonValue,
        penaltyForNonCompliance: item.penaltyForNonCompliance,
        reminderSent30Days: false,
        reminderSent14Days: false,
        reminderSent3Days: false,
        lastCheckedAt: new Date(),
        proofUrl: null,
      })),
    });

    return NextResponse.json({ count: items.length });
  } catch (err) {
    console.error("generate-compliance error:", err);
    return NextResponse.json({ error: "Compliance generation failed" }, { status: 500 });
  }
}
