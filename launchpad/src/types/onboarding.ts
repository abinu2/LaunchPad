import type { BusinessProfile } from "@/types/business";

export type OnboardingAnswers = {
  businessDescription: string;
  workStructure: string;
  personalAssets: string;
  incomeSource: string;
  businessName: string;
  estimatedRevenue: string;
  helpDetails?: string;
};

export type OnboardingResult = {
  businessProfile: Omit<BusinessProfile, "id" | "createdAt" | "updatedAt" | "financials">;
  entityRecommendation: {
    recommended: string;
    reasoning: string;
    filingCost: number;
    processingTime: string;
    filingUrl: string;
    alternativeConsiderations: string;
  };
  nameAnalysis: {
    name: string;
    available: boolean;
    trademarkRisk: "low" | "medium" | "high";
    domainAvailable: boolean;
    suggestions: string[];
  };
  formationChecklist: {
    id: string;
    title: string;
    description: string;
    estimatedTime: string;
    estimatedCost: number;
    link: string;
    dependencies: string[];
    category: string;
  }[];
  complianceItems: {
    title: string;
    description: string;
    jurisdiction: "federal" | "state" | "county" | "city";
    jurisdictionName: string;
    category: "license" | "registration" | "permit" | "tax_filing" | "insurance" | "report";
    isRequired: boolean;
    legalCitation: string | null;
    applicationUrl: string | null;
    cost: number;
    renewalFrequency: "monthly" | "quarterly" | "annual" | "biennial" | "one_time" | null;
    estimatedProcessingTime: string;
    documentationRequired: string[];
    penaltyForNonCompliance: string | null;
  }[];
  keyInsights: string[];
  urgentWarnings: string[];
};
