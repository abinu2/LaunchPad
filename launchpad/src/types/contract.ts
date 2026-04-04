export interface ContractObligation {
  id: string;
  clauseRef: string;
  description: string;
  party: "business" | "counterparty";
  triggerType: "date" | "event" | "threshold" | "recurring";
  triggerDescription: string;
  dueDate: string | null;
  recurringFrequency: "daily" | "weekly" | "monthly" | "quarterly" | "annual" | null;
  status: "pending" | "fulfilled" | "at_risk" | "breached" | "not_applicable";
  monitoredField: string | null;
  monitoredThreshold: number | null;
  lastChecked: string;
  notes: string | null;
}

export interface Contract {
  id: string;
  businessId: string;
  uploadedAt: string;
  fileName: string;
  fileUrl: string;
  fileType: "pdf" | "docx" | "image" | "generated";
  contractType:
    | "service_agreement"
    | "vendor_agreement"
    | "lease"
    | "partnership"
    | "employment"
    | "financing"
    | "other";
  counterpartyName: string;
  effectiveDate: string | null;
  expirationDate: string | null;
  autoRenews: boolean;
  autoRenewalDate: string | null;
  autoRenewalNoticePeriod: number | null;
  terminationNoticePeriod: number | null;
  totalValue: number | null;
  monthlyValue: number | null;
  analysis: ContractAnalysis;
  obligations: ContractObligation[];
  healthScore: number;
  status: "active" | "expiring_soon" | "expired" | "draft" | "under_review";
}

export interface ContractAnalysis {
  summary: string;
  riskLevel: "low" | "medium" | "high" | "critical";
  clauses: ClauseAnalysis[];
  missingProtections: string[];
  conflicts: ContractConflict[];
  recommendations: string[];
  estimatedAnnualCost: number | null;
  counterProposalDraft: string | null;
  playbookDeviations: PlaybookDeviation[];
  /** HTML content for AI-generated contracts saved to the vault */
  generatedHtml?: string;
}

export interface ClauseAnalysis {
  clauseNumber: string;
  clauseTitle: string;
  originalText: string;
  plainEnglish: string;
  riskLevel: "safe" | "caution" | "danger";
  issue: string | null;
  recommendation: string | null;
  businessImpact: string | null;
  playbookClause: string | null;
}

export interface PlaybookDeviation {
  clauseTitle: string;
  currentLanguage: string;
  playbookLanguage: string;
  reason: string;
}

export interface ContractConflict {
  thisClause: string;
  conflictingContractId: string;
  conflictingContractName: string;
  conflictingClause: string;
  description: string;
  recommendation: string;
}
