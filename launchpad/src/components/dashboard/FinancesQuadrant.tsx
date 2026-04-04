import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";
import type { BusinessProfile } from "@/types/business";

interface Props {
  quotes: Quote[];
  receipts: Receipt[];
  business?: BusinessProfile;
}

function getCurrentMonthStats(quotes: Quote[], receipts: Receipt[]) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const revenue = quotes
    .filter((q) => q.status === "paid" && q.paidAt && q.paidAt.toDate?.().toISOString().slice(0, 10) >= monthStart)
    .reduce((sum, q) => sum + q.total, 0);

  const expenses = receipts
    .filter((r) => r.date >= monthStart)
    .reduce((sum, r) => sum + (r.deductibleAmount ?? r.amount), 0);

  const profit = revenue - expenses;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  return { revenue, expenses, profit, margin };
}

export function FinancesQuadrant({ quotes, receipts, business }: Props) {
  const { revenue, expenses, profit, margin } = getCurrentMonthStats(quotes, receipts);
  const monthName = new Date().toLocaleString("default", { month: "long" });
  const cashBalance = business?.financials?.currentCashBalance;
  const hasData = revenue > 0 || expenses > 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full group-hover:border-blue-300 group-hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Am I Keeping Enough Money?</p>
          <p className="text-2xl font-bold text-slate-900">
            {cashBalance !== null && cashBalance !== undefined
              ? `$${cashBalance.toLocaleString()}`
              : hasData ? `$${profit.toLocaleString()}` : "—"}
          </p>
          <p className="text-sm text-slate-500">
            {cashBalance !== null && cashBalance !== undefined
              ? "current cash balance"
              : `${monthName} profit${hasData ? ` (${margin}% margin)` : ""}`}
          </p>
        </div>
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {hasData ? (
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Revenue</span>
            <span className="font-medium text-slate-900">${revenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Expenses</span>
            <span className="font-medium text-slate-900">${expenses.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 mb-3">
          {cashBalance !== null && cashBalance !== undefined
            ? "Connect bank to track income & expenses"
            : "Scan receipts or connect your bank to see P&L"}
        </p>
      )}

      <div className="pt-3 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} · {quotes.filter((q) => q.status === "paid").length} paid quotes
          {cashBalance !== null && cashBalance !== undefined ? " · bank linked" : ""}
        </p>
      </div>
    </div>
  );
}
