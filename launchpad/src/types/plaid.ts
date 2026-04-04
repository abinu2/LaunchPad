export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;        // depository, credit, loan, investment
  subtype: string | null; // checking, savings, credit card, etc.
  balances: {
    available: number | null;
    current: number | null;
    limit: number | null;
    iso_currency_code: string | null;
  };
  mask: string | null; // last 4 digits
}

export interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number;       // positive = debit (money out), negative = credit (money in)
  date: string;         // YYYY-MM-DD
  name: string;
  merchant_name: string | null;
  category: string[];
  pending: boolean;
  payment_channel: string;
  personal_finance_category?: {
    primary: string;
    detailed: string;
  };
}

export interface PlaidConnection {
  id: string;
  businessId: string;
  itemId: string;
  accessToken: string;   // stored server-side only
  institutionId: string;
  institutionName: string;
  connectedAt: string;
  lastSyncedAt: string | null;
  accounts: PlaidAccount[];
  status: "active" | "error" | "disconnected";
  errorCode: string | null;
}

export interface PlaidSyncResult {
  accounts: PlaidAccount[];
  transactions: PlaidTransaction[];
  totalInflow: number;
  totalOutflow: number;
  syncedAt: string;
}
