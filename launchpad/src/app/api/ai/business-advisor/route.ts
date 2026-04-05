import { NextRequest, NextResponse } from "next/server";
import { groqJSON, isGroqConfigured } from "@/lib/groq";
import { generateJSON } from "@/lib/vertex-ai";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";
export const maxDuration = 10;

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

    // Lean prompt — only the fields the app actually uses, no verbose instructions
    const prompt = `You are a business formation advisor. Generate a business plan for this new business owner.

BUSINESS: ${body.businessDescription}
WORK STRUCTURE: ${body.workStructure}
PERSONAL ASSETS USED: ${body.personalAssets}
INCOME SOURCE: ${body.incomeSource}
BUSINESS NAME: ${body.businessName || "Not yet decided"}
ESTIMATED MONTHLY REVENUE: ${body.estimatedRevenue}
${body.helpDetails ? `HELP DETAILS: ${body.helpDetails}` : ""}

Rules: Recommend LLC over sole prop if physical client interaction. Flag commercial auto gap if personal vehicle used. Warn about quarterly estimated taxes. Flag employee vs contractor risk if applicable.

Return ONLY valid JSON (no markdown):
{
  "businessProfile": {
    "businessName": "string",
    "businessType": "string",
    "naicsCode": "string",
    "entityType": "sole_prop|llc|s_corp|c_corp|partnership",
    "entityState": "2-letter state code",
    "ownerName": "",
    "ownerEmail": "",
    "ownerPhone": "",
    "hasOtherJob": boolean,
    "estimatedW2Income": null,
    "isFirstTimeBusiness": true,
    "serviceTypes": [{"id":"1","name":"string","description":"string","basePrice":number,"estimatedDuration":60,"supplyCost":number}],
    "targetMarket": "residential|commercial|both",
    "usesPersonalVehicle": boolean,
    "hasEmployees": boolean,
    "employeeCount": 0,
    "hasContractors": boolean,
    "contractorCount": 0,
    "businessAddress": {"street":"","city":"string","state":"string","zip":"","county":"string"},
    "operatingJurisdictions": ["string"],
    "onboardingStage": "formation",
    "completedSteps": []
  },
  "entityRecommendation": {
    "recommended": "sole_prop|llc|s_corp|c_corp|partnership",
    "reasoning": "2-3 sentences specific to their situation",
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
    "suggestions": ["string","string","string"]
  },
  "formationChecklist": [
    {"id":"string","title":"string","description":"string","estimatedTime":"string","estimatedCost":number,"link":"string","dependencies":[],"category":"legal|tax|insurance|licensing|banking"}
  ],
  "complianceItems": [
    {"title":"string","description":"string","jurisdiction":"federal|state|county|city","jurisdictionName":"string","category":"license|registration|permit|tax_filing|insurance|report","isRequired":true,"legalCitation":null,"applicationUrl":null,"cost":0,"renewalFrequency":"annual","estimatedProcessingTime":"string","documentationRequired":[],"penaltyForNonCompliance":null}
  ],
  "keyInsights": ["string","string","string"],
  "urgentWarnings": ["string"]
}`;

    const result = isGroqConfigured()
      ? await groqJSON<Record<string, unknown>>(prompt)
      : await generateJSON<Record<string, unknown>>(prompt);

    return NextResponse.json(result);
  } catch (err) {
    console.error("business-advisor error:", err);
    return NextResponse.json(
      { error: "Failed to generate business plan" },
      { status: 500 }
    );
  }
}
