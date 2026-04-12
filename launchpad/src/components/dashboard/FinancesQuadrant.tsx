import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";
import type { BusinessProfile } from "@/types/business";
import { summarizeFinances } from "@/lib/finance";

interface Props {
  quotes: Quote[];
  receipts: Receipt[];
  business?: BusinessProfile;
}

export function FinancesQuadrant({ quotes, receipts, business }: Props) {
  const summary = summarizeFinances(quotes, receipts);
  const currentMonth = summary.monthlyData[summary.monthlyData.length - 1];
  const revenue = currentMonth?.revenue ?? 0;
  const expenses = currentMonth?.expenses ?? 0;
  const profit = currentMonth?.profit ?? 0;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
  const monthName = new Date().toLocaleString("default", { month: "long" });
  const cashBalance = business?.financials?.currentCashBalance;
  const hasData = revenue > 0 || expenses > 0;

  return (
    <div className="glass-card rounded-xl p-5 h-full group-hover:border-[#00CF31]/30 group-hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">Am I Keeping Enough Money?</p>
          <p className="text-2xl font-bold text-white">
            {cashBalance !== null && cashBalance !== undefined
              ? `$${cashBalance.toLocaleString()}`
              : hasData ? `$${profit.toLocaleString()}` : "—"}
          </p>
          <p className="text-sm text-white/50">
            {cashBalance !== null && cashBalance !== undefined
              ? "current cash balance"
              : `${monthName} operating profit${hasData ? ` (${margin}% margin)` : ""}`}
          </p>
        </div>
        <div className="w-10 h-10 bg-[#00CF31]/15 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-[#00CF31]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      {hasData ? (
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Collected revenue</span>
            <span className="font-medium text-white">${revenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/50">Deductible expenses</span>
            <span className="font-medium text-white">${expenses.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#00CF31] rounded-full" style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/40 mb-3">
          {cashBalance !== null && cashBalance !== undefined
            ? "Connect bank to track income & expenses"
            : "Scan receipts or connect your bank to see P&L"}
        </p>
      )}

      <div className="pt-3 border-t border-white/8">
        <p className="text-xs text-white/40">
          {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} · {quotes.filter((q) => q.status === "paid").length} paid quotes
          {cashBalance !== null && cashBalance !== undefined ? " · bank linked" : ""}
        </p>
      </div>
    </div>
  );
}
