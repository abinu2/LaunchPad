export interface Quote {
  id: string;
  businessId: string;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  services: QuoteLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  pricingAnalysis?: {
    supplyCost: number;
    estimatedLaborHours: number;
    estimatedLaborCost: number;
    profitMargin: number;
    marketComparison: string;
    recommendation: string;
    suggestedPrice: number;
  };
  status:
    | "draft"
    | "sent"
    | "viewed"
    | "accepted"
    | "declined"
    | "expired"
    | "invoiced"
    | "paid";
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  paidAt: string | null;
  contractGenerated: boolean;
  contractId: string | null;
  contractSignedAt: string | null;
  stripePaymentIntentId: string | null;
  paymentMethod: "stripe" | "venmo" | "cash" | "check" | null;
  paymentUrl: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  scheduledAddress: string | null;
  followUpsSent: number;
  lastFollowUpAt: string | null;
  nextFollowUpAt: string | null;
}

export interface QuoteLineItem {
  serviceId: string;
  serviceName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  addOns: { name: string; price: number }[];
}
