import Link from "next/link";
import type { DashboardData } from "@/app/dashboard/page";
import type { BusinessProfile } from "@/types/business";

interface Priority {
  level: "urgent" | "warning" | "info";
  category: "protection" | "compliance" | "finances" | "growth";
  message: string;
  action?: string;
  href?: string;
}

const LEVEL_STYLES = {
  urgent: {
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-400 border-red-500/20",
    border: "border-l-red-500",
  },
  warning: {
    dot: "bg-amber-400",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    border: "border-l-amber-400",
  },
  info: {
    dot: "bg-blue-400",
    badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
    border: "border-l-blue-400",
  },
};

const CAT_LABEL: Record<Priority["category"], string> = {
  protection: "Contracts",
  compliance: "Compliance",
  finances: "Finances",
  growth: "Growth",
};

function buildPriorities(data: DashboardData, business: BusinessProfile): Priority[] {
  const list: Priority[] = [];

  // ── Compliance ────────────────────────────────────────────────────────────
  const overdue = data.complianceItems.filter((i) => i.status === "overdue");
  overdue.forEach((i) => {
    list.push({
      level: "urgent",
      category: "compliance",
      message: `${i.title} is overdue. ${i.penaltyForNonCompliance ?? "Action required."}`,
      action: "Fix now",
      href: i.applicationUrl ?? "/dashboard/compliance",
    });
  });

  const urgentDue = data.complianceItems.filter(
    (i) => i.status === "due_soon" && (i.daysUntilDue ?? 999) <= 7
  );
  urgentDue.forEach((i) => {
    list.push({
      level: "warning",
      category: "compliance",
      message: `${i.title} due in ${i.daysUntilDue} day${i.daysUntilDue === 1 ? "" : "s"}.${i.cost ? ` ~$${i.cost.toLocaleString()}` : ""}`,
      action: "Take action",
      href: i.applicationUrl ?? "/dashboard/compliance",
    });
  });

  // ── Contracts ─────────────────────────────────────────────────────────────
  const autoRenewing = data.contracts.filter((c) => {
    if (!c.autoRenews || !c.autoRenewalDate) return false;
    const days = Math.ceil((new Date(c.autoRenewalDate).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 14;
  });
  autoRenewing.forEach((c) => {
    const days = Math.ceil((new Date(c.autoRenewalDate!).getTime() - Date.now()) / 86400000);
    list.push({
      level: days <= 7 ? "urgent" : "warning",
      category: "protection",
      message: `${c.counterpartyName} contract auto-renews in ${days} day${days === 1 ? "" : "s"}. Review before it locks in.`,
      action: "Review",
      href: "/dashboard/protection",
    });
  });

  const highRisk = data.contracts.filter((c) => c.analysis?.riskLevel === "critical" || c.analysis?.riskLevel === "high");
  if (highRisk.length > 0) {
    list.push({
      level: "warning",
      category: "protection",
      message: `${highRisk.length} contract${highRisk.length > 1 ? "s" : ""} flagged as high risk. Consider renegotiating key terms.`,
      action: "View contracts",
      href: "/dashboard/protection",
    });
  }

  // ── Finances ──────────────────────────────────────────────────────────────
  const unpaid = data.quotes.filter((q) => q.status === "accepted" && !q.paidAt);
  if (unpaid.length > 0) {
    const total = unpaid.reduce((s, q) => s + q.total, 0);
    list.push({
      level: unpaid.length >= 3 ? "warning" : "info",
      category: "finances",
      message: `${unpaid.length} accepted quote${unpaid.length > 1 ? "s" : ""} ($${total.toLocaleString()}) awaiting payment.`,
      action: "Send invoices",
      href: "/quotes",
    });
  }

  const staleQuotes = data.quotes.filter((q) => {
    if (q.status !== "sent" && q.status !== "viewed") return false;
    const sentAt = q.sentAt ? new Date(q.sentAt).getTime() : 0;
    return Date.now() - sentAt > 7 * 86400000;
  });
  if (staleQuotes.length > 0) {
    list.push({
      level: "info",
      category: "finances",
      message: `${staleQuotes.length} quote${staleQuotes.length > 1 ? "s" : ""} haven't had a response in 7+ days. Send a follow-up.`,
      action: "Follow up",
      href: "/quotes",
    });
  }

  // ── Growth ────────────────────────────────────────────────────────────────
  const highUrgencyActions = data.growthActions.filter((a) => a.urgency === "high").slice(0, 1);
  highUrgencyActions.forEach((a) => {
    list.push({
      level: "info",
      category: "growth",
      message: a.title + (a.impact ? ` — ${a.impact}` : ""),
      action: "View",
      href: "/dashboard/growth",
    });
  });

  const urgentOpps = data.opportunities
    .filter((o) => o.applicationDeadline && o.status === "discovered")
    .filter((o) => {
      const days = Math.ceil((new Date(o.applicationDeadline!).getTime() - Date.now()) / 86400000);
      return days <= 14;
    });
  if (urgentOpps.length > 0) {
    const opp = urgentOpps[0];
    const days = Math.ceil((new Date(opp.applicationDeadline!).getTime() - Date.now()) / 86400000);
    list.push({
      level: days <= 7 ? "urgent" : "warning",
      category: "growth",
      message: `Funding deadline: ${opp.name} (up to $${opp.amount.max.toLocaleString()}) closes in ${days} day${days === 1 ? "" : "s"}.`,
      action: "Apply",
      href: "/dashboard/growth",
    });
  }

  // Fallback
  if (list.length === 0 && business) {
    list.push({
      level: "info",
      category: "growth",
      message: "Your business is on track. Keep building momentum.",
    });
  }

  // Sort: urgent first, then warning, then info
  const order = { urgent: 0, warning: 1, info: 2 };
  return list.sort((a, b) => order[a.level] - order[b.level]).slice(0, 5);
}

export function TodaysPriorities({ data, business }: { data: DashboardData; business: BusinessProfile }) {
  const priorities = buildPriorities(data, business);

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wide">Today's Priorities</p>
        <span className="text-xs text-white/40">{priorities.filter((p) => p.level !== "info").length} items need attention</span>
      </div>

      <div className="space-y-2">
        {priorities.map((p, i) => {
          const styles = LEVEL_STYLES[p.level];
          return (
            <div
              key={i}
              className={`flex items-start gap-3 pl-3 border-l-2 ${styles.border} py-1`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${styles.badge}`}>
                    {CAT_LABEL[p.category]}
                  </span>
                </div>
                <p className="text-sm text-white/70 leading-snug">{p.message}</p>
              </div>
              {p.href && p.action && (
                <Link
                  href={p.href}
                  className="flex-shrink-0 text-xs font-medium text-[#00CF31] hover:text-[#00b82c] hover:underline mt-0.5"
                >
                  {p.action} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
