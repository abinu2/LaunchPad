"use client";

import type { DashboardData } from "@/app/dashboard/page";
import type { BusinessProfile } from "@/types/business";

interface Props {
  data: DashboardData;
  business: BusinessProfile;
}

function getTopInsight(data: DashboardData): { message: string; link?: string; linkLabel?: string } | null {
  // Check for overdue compliance
  const overdue = data.complianceItems.find((i) => i.status === "overdue");
  if (overdue) {
    return {
      message: `⚠️ ${overdue.title} is overdue. ${overdue.penaltyForNonCompliance ?? "Take action now."}`,
      link: "/dashboard/compliance",
      linkLabel: "View compliance",
    };
  }

  // Check for compliance due in 7 days
  const urgent = data.complianceItems.find(
    (i) => i.status === "due_soon" && i.daysUntilDue !== null && i.daysUntilDue <= 7
  );
  if (urgent) {
    return {
      message: `📅 ${urgent.title} is due in ${urgent.daysUntilDue} days. ${urgent.cost ? `Estimated amount: $${urgent.cost}.` : ""}`,
      link: urgent.applicationUrl ?? "/dashboard/compliance",
      linkLabel: "Take action",
    };
  }

  // Check for contract auto-renewal
  const autoRenewing = data.contracts.find((c) => {
    if (!c.autoRenews || !c.autoRenewalDate) return false;
    const days = Math.ceil((new Date(c.autoRenewalDate).getTime() - Date.now()) / 86400000);
    return days > 0 && days <= 14;
  });
  if (autoRenewing) {
    const days = Math.ceil((new Date(autoRenewing.autoRenewalDate!).getTime() - Date.now()) / 86400000);
    return {
      message: `🔄 Your ${autoRenewing.counterpartyName} contract auto-renews in ${days} days. Review before it locks in.`,
      link: "/dashboard/protection",
      linkLabel: "Review contract",
    };
  }

  // Check for unpaid quotes
  const unpaid = data.quotes.filter((q) => q.status === "accepted" && !q.paidAt);
  if (unpaid.length > 0) {
    const total = unpaid.reduce((sum, q) => sum + q.total, 0);
    return {
      message: `💰 You have ${unpaid.length} accepted quote${unpaid.length > 1 ? "s" : ""} awaiting payment — $${total.toLocaleString()} total.`,
      link: "/quotes",
      linkLabel: "View quotes",
    };
  }

  return null;
}

export function AIInsightBanner({ data }: Props) {
  const insight = getTopInsight(data);
  if (!insight) return null;

  return (
    <div className="bg-[#00CF31]/15 text-[#00CF31] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
      <p className="text-sm">{insight.message}</p>
      {insight.link && (
        <a
          href={insight.link}
          className="flex-shrink-0 text-xs font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
        >
          {insight.linkLabel}
        </a>
      )}
    </div>
  );
}
