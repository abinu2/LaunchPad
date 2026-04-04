import { NextRequest, NextResponse } from "next/server";
import { generateJSON } from "@/lib/vertex-ai";

interface OnboardingAnswers {
  businessDescription: string;
  workStructure: string;
  personalAssets: string;
  incomeSource: string;
  businessName: string;
  estimatedRevenue: string;
  helpDetails?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: OnboardingAnswers = await req.json();

    const prompt = `
You are an expert business formation advisor specializing in small businesses. You have deep knowledge of:
- Entity formation requirements for all 50 US states
- IRS tax classification rules and elections
- State and local business licensing requirements
- Insurance requirements by industry and jurisdiction
- Contract law and industry-standard service agreements

Given this business description and intake answers, generate a comprehensive business formation plan.
Be SPECIFIC to their exact situation — never give generic advice. Reference specific statutes, specific dollar amounts, specific URLs, and specific timelines.

BUSINESS DESCRIPTION: ${body.businessDescription}
WORK STRUCTURE: ${body.workStructure}
PERSONAL ASSETS USED: ${body.personalAssets}
INCOME SOURCE: ${body.incomeSource}
BUSINESS NAME: ${body.businessName || "Not yet decided"}
ESTIMATED MONTHLY REVENUE: ${body.estimatedRevenue}
${body.helpDetails ? `HELP NEEDED: ${body.helpDetails}` : ""}

CRITICAL RULES:
- Always recommend an LLC over sole proprietorship if the business involves any physical interaction with client property
- Always flag the commercial auto insurance gap if they're using a personal vehicle
- Always check for employee vs. contractor misclassification risk
- Always mention the Section 199A QBI deduction for pass-through entities under $182,100
- Always warn about quarterly estimated tax obligations
- If they're in Arizona, mention that LLC annual reports are $0
- If estimated revenue exceeds $80K, mention that S-Corp election should be evaluated

Return a JSON object with this exact structure:
{
  "businessProfile": {
    "businessName": "string",
    "businessType": "string (e.g. mobile_car_detailing)",
    "naicsCode": "string",
    "entityType": "sole_prop|llc|s_corp|c_corp|partnership",
    "entityState": "string (2-letter state code, infer from description)",
    "ownerName": "",
    "ownerEmail": "",
    "ownerPhone": "",
    "hasOtherJob": boolean,
    "estimatedW2Income": null,
    "isFirstTimeBusiness": true,
    "serviceTypes": [{ "id": "1", "name": "string", "description": "string", "basePrice": number, "estimatedDuration": 60, "supplyCost": number }],
    "targetMarket": "residential|commercial|both",
    "usesPersonalVehicle": boolean,
    "hasEmployees": boolean,
    "employeeCount": 0,
    "hasContractors": boolean,
    "contractorCount": 0,
    "businessAddress": { "street": "", "city": "string", "state": "string", "zip": "", "county": "string" },
    "operatingJurisdictions": ["string"],
    "onboardingStage": "formation",
    "completedSteps": []
  },
  "entityRecommendation": {
    "recommended": "sole_prop|llc|s_corp|c_corp|partnership",
    "reasoning": "string (specific to their situation)",
    "filingCost": number,
    "processingTime": "string",
    "filingUrl": "string",
    "alternativeConsiderations": "string"
  },
  "nameAnalysis": {
    "name": "string",
    "available": true,
    "trademarkRisk": "low|medium|high",
    "domainAvailable": true,
    "suggestions": ["string", "string", "string"]
  },
  "formationChecklist": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "estimatedTime": "string",
      "estimatedCost": number,
      "link": "string",
      "dependencies": [],
      "category": "legal|tax|insurance|licensing|banking"
    }
  ],
  "complianceItems": [
    {
      "title": "string",
      "description": "string",
      "jurisdiction": "federal|state|county|city",
      "jurisdictionName": "string",
      "category": "license|registration|permit|tax_filing|insurance|report",
      "isRequired": true,
      "legalCitation": "string|null",
      "applicationUrl": "string|null",
      "cost": number,
      "renewalFrequency": "monthly|quarterly|annual|biennial|one_time|null",
      "estimatedProcessingTime": "string",
      "documentationRequired": ["string"],
      "penaltyForNonCompliance": "string|null"
    }
  ],
  "keyInsights": ["string", "string", "string"],
  "urgentWarnings": ["string"]
}`;

    const result = await generateJSON<Record<string, unknown>>(prompt);
    return NextResponse.json(result);
  } catch (err) {
    console.error("business-advisor error:", err);
    return NextResponse.json(
      { error: "Failed to generate business plan" },
      { status: 500 }
    );
  }
}
