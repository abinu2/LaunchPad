import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";
import type { PlaidTransaction } from "@/types/plaid";

export interface FinanceMonthSummary {
  month: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface FinanceSummary {
  paidRevenue: number;
  receiptExpenses: number;
  deductibleExpenses: number;
  pendingIncome: number;
  pendingQuoteCount: number;
  monthlyData: FinanceMonthSummary[];
  averageMonthlyRevenue: number;
  averageMonthlyExpenses: number;
  averageMonthlyProfit: number;
}

function monthKey(dateLike: string | null | undefined) {
  if (!dateLike) return null;
  const value = dateLike.slice(0, 7);
  return /^\d{4}-\d{2}$/.test(value) ? value : null;
}

export function summarizeFinances(quotes: Quote[], receipts: Receipt[]): FinanceSummary {
  const months: Record<string, { revenue: number; expenses: number }> = {};

  const addMonthValue = (key: string | null, field: "revenue" | "expenses", amount: number) => {
    if (!key || !Number.isFinite(amount)) return;
    if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
    months[key][field] += amount;
  };

  const paidQuotes = quotes.filter((quote) => quote.status === "paid");
  const pendingQuotes = quotes.filter((quote) => ["sent", "viewed", "accepted"].includes(quote.status));

  for (const quote of paidQuotes) {
    const paidMonth = monthKey(quote.paidAt);
    addMonthValue(paidMonth, "revenue", quote.total);
  }

  for (const receipt of receipts) {
    addMonthValue(monthKey(receipt.date), "expenses", receipt.deductibleAmount ?? receipt.amount);
  }

  const monthlyData = Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      label: new Date(`${month}-01`).toLocaleString("default", { month: "short" }),
      revenue: data.revenue,
      expenses: data.expenses,
      profit: data.revenue - data.expenses,
    }));

  const averageMonthlyRevenue =
    monthlyData.length > 0
      ? monthlyData.reduce((sum, month) => sum + month.revenue, 0) / monthlyData.length
      : 0;
  const averageMonthlyExpenses =
    monthlyData.length > 0
      ? monthlyData.reduce((sum, month) => sum + month.expenses, 0) / monthlyData.length
      : 0;
  const averageMonthlyProfit =
    monthlyData.length > 0
      ? monthlyData.reduce((sum, month) => sum + month.profit, 0) / monthlyData.length
      : 0;

  return {
    paidRevenue: paidQuotes.reduce((sum, quote) => sum + quote.total, 0),
    receiptExpenses: receipts.reduce((sum, receipt) => sum + receipt.amount, 0),
    deductibleExpenses: receipts.reduce(
      (sum, receipt) => sum + (receipt.deductibleAmount ?? receipt.amount),
      0
    ),
    pendingIncome: pendingQuotes.reduce((sum, quote) => sum + quote.total, 0),
    pendingQuoteCount: pendingQuotes.length,
    monthlyData,
    averageMonthlyRevenue,
    averageMonthlyExpenses,
    averageMonthlyProfit,
  };
}

export function summarizeBankCash(transactions: PlaidTransaction[]) {
  const settled = transactions.filter((transaction) => !transaction.pending);
  const inflow = settled
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const outflow = settled
    .filter((transaction) => transaction.amount > 0)
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return { inflow, outflow };
}
