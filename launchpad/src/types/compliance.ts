export interface ComplianceItem {
  id: string;
  businessId: string;
  title: string;
  description: string;
  jurisdiction: "federal" | "state" | "county" | "city";
  jurisdictionName: string;
  category: "license" | "registration" | "permit" | "tax_filing" | "insurance" | "report";
  isRequired: boolean;
  legalCitation: string | null;
  status: "compliant" | "due_soon" | "overdue" | "not_started" | "not_applicable";
  obtainedDate: string | null;
  expirationDate: string | null;
  renewalDate: string | null;
  renewalFrequency: "monthly" | "quarterly" | "annual" | "biennial" | "one_time" | null;
  daysUntilDue: number | null;
  applicationUrl: string | null;
  cost: number | null;
  estimatedProcessingTime: string | null;
  documentationRequired: string[];
  penaltyForNonCompliance: string | null;
  reminderSent30Days: boolean;
  reminderSent14Days: boolean;
  reminderSent3Days: boolean;
  lastCheckedAt: string;
  proofUrl: string | null;
}

export interface FundingOpportunity {
  id: string;
  businessId: string;
  discoveredAt: string;
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
  status:
    | "discovered"
    | "reviewing"
    | "applying"
    | "submitted"
    | "approved"
    | "denied"
    | "dismissed";
  applicationProgress: number;
  prefilledFields: Record<string, string>;
  fitScore: number;
  recommendation: string;
  estimatedTimeToApply: string;
}
