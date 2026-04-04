export type ExpenseCategory =
  | "supplies"
  | "vehicle_fuel"
  | "vehicle_maintenance"
  | "insurance"
  | "rent"
  | "utilities"
  | "marketing"
  | "equipment"
  | "professional_services"
  | "meals_entertainment"
  | "office_supplies"
  | "software"
  | "training"
  | "other";

export interface Receipt {
  id: string;
  businessId: string;
  uploadedAt: string;
  imageUrl: string;
  vendor: string;
  amount: number;
  date: string;
  lineItems: LineItem[];
  category: ExpenseCategory;
  taxClassification: "cogs" | "expense" | "asset" | "personal" | "mixed";
  businessPercentage: number;
  deductibleAmount: number;
  taxNotes: string;
  isReconciled: boolean;
  associatedMileage: number | null;
  needsMoreInfo: boolean;
  pendingQuestion: string | null;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface TaxSummary {
  businessId: string;
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  grossRevenue: number;
  returnsAndAllowances: number;
  netRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  expenses: Record<ExpenseCategory, number>;
  totalExpenses: number;
  mileageDeduction: number;
  homeOfficeDeduction: number;
  healthInsuranceDeduction: number;
  section199ADeduction: number;
  totalDeductions: number;
  netTaxableIncome: number;
  estimatedFederalTax: number;
  estimatedStateTax: number;
  estimatedSelfEmploymentTax: number;
  totalEstimatedTax: number;
  quarterlyPayments: {
    q1: { due: string; amount: number; paid: boolean; paidDate: string | null };
    q2: { due: string; amount: number; paid: boolean; paidDate: string | null };
    q3: { due: string; amount: number; paid: boolean; paidDate: string | null };
    q4: { due: string; amount: number; paid: boolean; paidDate: string | null };
  };
  missedDeductions: { description: string; estimatedValue: number; action: string }[];
  taxSavingOpportunities: string[];
}

export interface ProfitAndLoss {
  businessId: string;
  period: "monthly" | "quarterly" | "annual";
  startDate: string;
  endDate: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: Record<ExpenseCategory, number>;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  comparedToPreviousPeriod: {
    revenueChange: number;
    expenseChange: number;
    profitChange: number;
  };
}
