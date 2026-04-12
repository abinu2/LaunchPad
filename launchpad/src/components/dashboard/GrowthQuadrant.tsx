import Link from "next/link";
import type { BusinessProfile } from "@/types/business";
import type { Quote } from "@/types/quote";
import type { FundingOpportunity } from "@/types/compliance";
import type { GrowthAction } from "@/services/business-graph";

interface Props {
  business: BusinessProfile;
  quotes: Quote[];
  opportunities?: FundingOpportunity[];
  actions?: GrowthAction[];
}

const URGENCY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-yellow-400",
  low: "bg-blue-400",
};

export function GrowthQuadrant({ business, quotes, opportunities = [], actions = [] }: Props) {
  const ytd = business.financials?.totalRevenueYTD ?? 0;
  const monthsOp = business.formationDate
    ? Math.floor((new Date().getTime() - new Date(business.formationDate).getTime()) / (30 * 86400000))
    : 0;

  // Build a prioritised list of up to 3 items to show
  const items: { label: string; sub: string; urgency: "high" | "medium" | "low" }[] = [];

  // 1. AI-generated actions first (highest priority)
  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  const topActions = [...actions]
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
    .slice(0, 2);
  topActions.forEach((a) => items.push({ label: a.title, sub: a.impact, urgency: a.urgency }));

  // 2. Funding opportunity with nearest deadline
  const urgentOpp = opportunities
    .filter((o) => o.applicationDeadline && o.status === "discovered")
    .sort((a, b) => (a.applicationDeadline ?? "").localeCompare(b.applicationDeadline ?? ""))[0];
  if (urgentOpp && items.length < 3) {
    const days = urgentOpp.applicationDeadline
      ? Math.ceil((new Date(urgentOpp.applicationDeadline).getTime() - new Date().getTime()) / 86400000)
      : null;
    items.push({
      label: urgentOpp.name,
      sub: `Up to $${urgentOpp.amount.max.toLocaleString()} · ${days !== null ? `${days}d left` : "Apply now"}`,
      urgency: days !== null && days <= 14 ? "high" : "medium",
    });
  }

  // 3. Fallback: computed milestones
  if (items.length === 0) {
    const sentQuotes = quotes.filter((q) => ["sent", "viewed", "accepted", "declined", "paid"].includes(q.status));
    const acceptedQuotes = quotes.filter((q) => ["accepted", "paid"].includes(q.status));
    const rate = sentQuotes.length > 0 ? acceptedQuotes.length / sentQuotes.length : 0;

    if (rate > 0.9 && sentQuotes.length >= 5) {
      items.push({ label: "Raise your prices", sub: `${Math.round(rate * 100)}% acceptance rate — room to increase`, urgency: "medium" });
    }
    if (ytd > 0 && ytd < 50000) {
      const pct = Math.round((ytd / 50000) * 100);
      items.push({ label: `${pct}% to $50K milestone`, sub: "Unlocks SBA microloan eligibility", urgency: "low" });
    }
    if (ytd >= 80000) {
      items.push({ label: "Evaluate S-Corp election", sub: "Could save $3K–8K/year in SE tax", urgency: "high" });
    }
    if (items.length === 0) {
      items.push({ label: "Scan for opportunities", sub: "Find grants and microloans matched to your profile", urgency: "low" });
    }
  }

  const displayItems = items.slice(0, 3);
  const totalPotential = opportunities.reduce((s, o) => s + o.amount.max, 0);

  return (
    <div className="glass-card rounded-xl p-5 h-full group-hover:border-[#00CF31]/30 group-hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">What Should I Do Next?</p>
          <p className="text-2xl font-bold text-white">{displayItems.length}</p>
          <p className="text-sm text-white/50">
            {actions.length > 0 ? `${actions.length} action${actions.length !== 1 ? "s" : ""}` : "recommended actions"}
          </p>
        </div>
        <div className="w-10 h-10 bg-violet-500/15 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>

      <div className="space-y-3 mb-3">
        {displayItems.map((item, i) => (
          <div key={i} className="flex gap-2.5">
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
              <span className="text-xs font-bold text-white/30">{i + 1}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${URGENCY_DOT[item.urgency]}`} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white leading-tight">{item.label}</p>
              <p className="text-xs text-white/50 mt-0.5 leading-tight">{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {totalPotential > 0 && (
        <div className="pt-3 border-t border-white/8">
          <p className="text-xs text-white/40">
            {opportunities.length} opportunit{opportunities.length !== 1 ? "ies" : "y"} · <span className="font-medium text-[#00CF31]">${totalPotential.toLocaleString()} potential</span>
          </p>
        </div>
      )}
    </div>
  );
}
