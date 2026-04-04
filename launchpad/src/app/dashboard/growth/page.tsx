"use client";

import { useEffect, useState, useCallback } from "react";
import { useBusiness } from "@/context/BusinessContext";
import {
  getFundingOpportunities,
  getGrowthActions,
  getQuotes,
  getReceipts,
  dismissGrowthAction,
  updateFundingOpportunity,
  type GrowthAction,
} from "@/services/business-graph";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { FundingOpportunity } from "@/types/compliance";
import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";
import type { BusinessProfile } from "@/types/business";

// ─── types ────────────────────────────────────────────────────────────────────

type Tab = "actions" | "funding" | "milestones" | "digest";

interface PageData {
  opportunities: FundingOpportunity[];
  actions: GrowthAction[];
  quotes: Quote[];
  receipts: Receipt[];
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  grant: "Grant",
  microloan: "Microloan",
  line_of_credit: "Line of Credit",
  sba_loan: "SBA Loan",
  competition: "Competition",
  other: "Other",
};

const TYPE_COLOR: Record<string, string> = {
  grant: "bg-green-100 text-green-700",
  microloan: "bg-blue-100 text-blue-700",
  line_of_credit: "bg-purple-100 text-purple-700",
  sba_loan: "bg-indigo-100 text-indigo-700",
  competition: "bg-orange-100 text-orange-700",
  other: "bg-slate-100 text-slate-600",
};

const URGENCY_DOT: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-yellow-400",
  low: "bg-blue-400",
};

const EFFORT_LABEL: Record<string, string> = {
  low: "Quick win",
  medium: "Some effort",
  high: "Major project",
};

function computeMilestones(business: BusinessProfile, quotes: Quote[]) {
  const ytd = business.financials?.totalRevenueYTD ?? 0;
  const monthsOp = business.formationDate
    ? Math.floor((Date.now() - new Date(business.formationDate).getTime()) / (30 * 86400000))
    : 0;
  const sentQuotes = quotes.filter((q) =>
    ["sent", "viewed", "accepted", "declined", "paid"].includes(q.status)
  );
  const acceptedQuotes = quotes.filter((q) => ["accepted", "paid"].includes(q.status));
  const acceptanceRate = sentQuotes.length > 0
    ? Math.round((acceptedQuotes.length / sentQuotes.length) * 100)
    : null;

  return [
    {
      id: "6mo",
      label: "6 months operating",
      description: "Eligible for most grants and SBA microloans",
      achieved: monthsOp >= 6,
      progress: Math.min(Math.round((monthsOp / 6) * 100), 100),
      progressLabel: monthsOp >= 6 ? null : `${monthsOp}/6 months`,
      unlocks: ["Most city/county grants", "Kiva microloans", "Accion loans"],
    },
    {
      id: "50k",
      label: "$50K revenue",
      description: "Unlocks SBA microloan eligibility and CDFI programs",
      achieved: ytd >= 50000,
      progress: Math.min(Math.round((ytd / 50000) * 100), 100),
      progressLabel: ytd >= 50000 ? null : `$${Math.round(ytd / 1000)}K / $50K`,
      unlocks: ["SBA Microloan Program", "Community Advantage loans", "Most CDFI programs"],
    },
    {
      id: "1yr",
      label: "1 year operating",
      description: "Eligible for SBA 7(a) loans and conventional business credit",
      achieved: monthsOp >= 12,
      progress: Math.min(Math.round((monthsOp / 12) * 100), 100),
      progressLabel: monthsOp >= 12 ? null : `${monthsOp}/12 months`,
      unlocks: ["SBA 7(a) loans", "Business lines of credit", "Equipment financing"],
    },
    {
      id: "80k",
      label: "$80K revenue",
      description: "S-Corp election threshold — could save $3K–8K/year in SE tax",
      achieved: ytd >= 80000,
      progress: Math.min(Math.round((ytd / 80000) * 100), 100),
      progressLabel: ytd >= 80000 ? null : `$${Math.round(ytd / 1000)}K / $80K`,
      unlocks: ["S-Corp tax election", "Payroll tax savings", "Retirement plan options"],
    },
    {
      id: "100k",
      label: "$100K revenue",
      description: "Conventional business loan eligibility and premium insurance rates",
      achieved: ytd >= 100000,
      progress: Math.min(Math.round((ytd / 100000) * 100), 100),
      progressLabel: ytd >= 100000 ? null : `$${Math.round(ytd / 1000)}K / $100K`,
      unlocks: ["Conventional business loans", "Premium insurance tiers", "Franchise opportunities"],
    },
    {
      id: "acceptance",
      label: "90%+ quote acceptance rate",
      description: "Strong signal your prices are below market — time to raise them",
      achieved: acceptanceRate !== null && acceptanceRate >= 90,
      progress: acceptanceRate ?? 0,
      progressLabel: acceptanceRate !== null ? `${acceptanceRate}%` : "No quotes yet",
      unlocks: ["Price increase opportunity", "Market positioning review"],
    },
  ];
}

function computeWeeklyDigest(
  business: BusinessProfile,
  quotes: Quote[],
  receipts: Receipt[],
  opportunities: FundingOpportunity[]
) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const weekRevenue = quotes
    .filter((q) => q.status === "paid" && (q.paidAt?.slice(0, 10) ?? "") >= weekAgoStr)
    .reduce((s, q) => s + q.total, 0);

  const weekExpenses = receipts
    .filter((r) => r.date >= weekAgoStr)
    .reduce((s, r) => s + r.amount, 0);

  const newOpps = opportunities.filter(
    (o) => o.status === "discovered"
  ).length;

  const ytd = business.financials?.totalRevenueYTD ?? 0;
  const monthlyAvg = business.financials?.monthlyRevenueAvg ?? 0;

  // Win of the week
  let win = "Keep going — every week of operation builds your eligibility for more funding.";
  if (weekRevenue > monthlyAvg * 0.5) win = `Strong week — $${weekRevenue.toLocaleString()} in revenue, above your weekly average.`;
  else if (newOpps > 0) win = `${newOpps} new funding opportunit${newOpps === 1 ? "y" : "ies"} discovered that match your profile.`;
  else if (ytd >= 50000) win = "You've crossed $50K in revenue — SBA microloan eligibility unlocked.";

  return { weekRevenue, weekExpenses, newOpps, win };
}
// ─── main page ────────────────────────────────────────────────────────────────

export default function GrowthPage() {
  const { business } = useBusiness();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [tab, setTab] = useState<Tab>("actions");
  const [selectedOpp, setSelectedOpp] = useState<FundingOpportunity | null>(null);

  const load = useCallback(async () => {
    if (!business?.id) return;
    const [opportunities, actions, quotes, receipts] = await Promise.all([
      getFundingOpportunities(business.id),
      getGrowthActions(business.id),
      getQuotes(business.id),
      getReceipts(business.id),
    ]);
    setData({ opportunities, actions, quotes, receipts });
    setLoading(false);
  }, [business?.id]);

  useEffect(() => { load(); }, [load]);

  const handleScan = async () => {
    if (!business?.id) return;
    setScanning(true);
    try {
      await fetch("/api/ai/scan-opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      await load();
      setTab("funding");
    } finally {
      setScanning(false);
    }
  };

  const handleDismiss = async (actionId: string) => {
    if (!business?.id || !data) return;
    await dismissGrowthAction(business.id, actionId);
    setData((d) => d ? { ...d, actions: d.actions.filter((a) => a.id !== actionId) } : d);
  };

  const handleOppStatus = async (opp: FundingOpportunity, status: FundingOpportunity["status"]) => {
    if (!business?.id) return;
    await updateFundingOpportunity(business.id, opp.id, { status });
    setData((d) => d ? {
      ...d,
      opportunities: d.opportunities.map((o) => o.id === opp.id ? { ...o, status } : o),
    } : d);
    setSelectedOpp(null);
  };

  if (loading) return <AILoadingScreen title="Loading growth data" steps={["Fetching opportunities", "Loading growth actions", "Analyzing revenue trends"]} variant="inline" />;
  if (!data || !business) return null;

  const milestones = computeMilestones(business, data.quotes);
  const digest = computeWeeklyDigest(business, data.quotes, data.receipts, data.opportunities);
  const achievedCount = milestones.filter((m) => m.achieved).length;
  const activeOpps = data.opportunities.filter((o) => !["denied", "dismissed"].includes(o.status));
  const totalPotential = activeOpps.reduce((s, o) => s + o.amount.max, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Growth Radar</h1>
          <p className="text-slate-500 text-sm mt-1">
            {achievedCount}/{milestones.length} milestones · {activeOpps.length} funding opportunities
            {totalPotential > 0 && ` · $${totalPotential.toLocaleString()} potential`}
          </p>
        </div>
        <Button onClick={handleScan} loading={scanning} size="sm">
          {scanning ? "Scanning..." : "Scan for opportunities"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: "actions", label: "Actions", count: data.actions.length },
          { id: "funding", label: "Funding", count: activeOpps.length },
          { id: "milestones", label: "Milestones", count: null },
          { id: "digest", label: "Weekly Digest", count: null },
        ] as { id: Tab; label: string; count: number | null }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.count !== null && t.count > 0 && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${tab === t.id ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-600"}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── ACTIONS TAB ── */}
      {tab === "actions" && (
        <ActionsTab actions={data.actions} onDismiss={handleDismiss} onScan={handleScan} scanning={scanning} />
      )}

      {/* ── FUNDING TAB ── */}
      {tab === "funding" && (
        <FundingTab
          opportunities={activeOpps}
          business={business}
          onSelect={setSelectedOpp}
          onScan={handleScan}
          scanning={scanning}
        />
      )}

      {/* ── MILESTONES TAB ── */}
      {tab === "milestones" && (
        <MilestonesTab milestones={milestones} />
      )}

      {/* ── DIGEST TAB ── */}
      {tab === "digest" && (
        <DigestTab digest={digest} business={business} opportunities={activeOpps} />
      )}

      {/* Application pre-filler modal */}
      {selectedOpp && business && (
        <ApplicationModal
          opportunity={selectedOpp}
          business={business}
          onClose={() => setSelectedOpp(null)}
          onStatusChange={(status) => handleOppStatus(selectedOpp, status)}
        />
      )}
    </div>
  );
}

// ─── Actions tab ─────────────────────────────────────────────────────────────

function ActionsTab({
  actions,
  onDismiss,
  onScan,
  scanning,
}: {
  actions: GrowthAction[];
  onDismiss: (id: string) => void;
  onScan: () => void;
  scanning: boolean;
}) {
  // Sort by urgency score: high=3, medium=2, low=1; effort inverse: low=3, medium=2, high=1
  const urgencyScore = { high: 3, medium: 2, low: 1 };
  const effortScore = { low: 3, medium: 2, high: 1 };
  const sorted = [...actions].sort(
    (a, b) =>
      urgencyScore[b.urgency] * effortScore[b.effort] -
      urgencyScore[a.urgency] * effortScore[a.effort]
  );

  if (sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <p className="text-slate-500 mb-2">No actions yet.</p>
        <p className="text-sm text-slate-400 mb-5">
          Run a scan to get AI-generated pricing, expense, and growth recommendations specific to your business.
        </p>
        <Button onClick={onScan} loading={scanning} size="sm">
          Scan now
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((action, i) => (
        <div key={action.id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
              <span className="text-xs font-bold text-slate-400">{i + 1}</span>
              <span className={`w-2 h-2 rounded-full ${URGENCY_DOT[action.urgency]}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{action.title}</p>
                <button
                  onClick={() => onDismiss(action.id)}
                  className="text-slate-300 hover:text-slate-500 flex-shrink-0 text-xs"
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm font-medium text-green-700 mt-0.5">{action.impact}</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{action.reasoning}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  action.urgency === "high" ? "bg-red-100 text-red-700" :
                  action.urgency === "medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-blue-100 text-blue-700"
                }`}>
                  {action.urgency} priority
                </span>
                <span className="text-xs text-slate-400">{EFFORT_LABEL[action.effort]}</span>
                <span className="text-xs text-slate-300">·</span>
                <span className="text-xs text-slate-400 capitalize">{action.type}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Funding tab ─────────────────────────────────────────────────────────────

function FundingTab({
  opportunities,
  business,
  onSelect,
  onScan,
  scanning,
}: {
  opportunities: FundingOpportunity[];
  business: BusinessProfile;
  onSelect: (opp: FundingOpportunity) => void;
  onScan: () => void;
  scanning: boolean;
}) {
  const [filter, setFilter] = useState<"all" | FundingOpportunity["type"]>("all");

  const filtered = filter === "all" ? opportunities : opportunities.filter((o) => o.type === filter);
  const types = [...new Set(opportunities.map((o) => o.type))];

  if (opportunities.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
        <p className="text-slate-500 mb-2">No funding opportunities scanned yet.</p>
        <p className="text-sm text-slate-400 mb-5">
          Scan to find grants, microloans, and SBA programs matched to your business profile.
        </p>
        <Button onClick={onScan} loading={scanning} size="sm">
          Scan for funding
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
            filter === "all" ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:border-slate-400"
          }`}
        >
          All ({opportunities.length})
        </button>
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              filter === t ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600 hover:border-slate-400"
            }`}
          >
            {TYPE_LABELS[t] ?? t} ({opportunities.filter((o) => o.type === t).length})
          </button>
        ))}
      </div>

      {filtered.map((opp) => (
        <div key={opp.id} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLOR[opp.type] ?? "bg-slate-100 text-slate-600"}`}>
                  {TYPE_LABELS[opp.type] ?? opp.type}
                </span>
                {opp.applicationDeadline && (
                  <span className="text-xs text-slate-400">
                    Deadline: {new Date(opp.applicationDeadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="font-semibold text-slate-900">{opp.name}</p>
              <p className="text-sm text-slate-500">{opp.provider}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-green-700 text-lg">
                {opp.type === "grant" ? "Up to " : ""}${opp.amount.max.toLocaleString()}
              </p>
              {opp.interestRate && <p className="text-xs text-slate-400">{opp.interestRate}</p>}
            </div>
          </div>

          <p className="text-sm text-slate-600 mb-3 leading-relaxed">{opp.recommendation}</p>

          {/* Eligibility criteria */}
          {opp.eligibilityCriteria?.length > 0 && (
            <div className="mb-3 space-y-1">
              {opp.eligibilityCriteria.slice(0, 3).map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={`flex-shrink-0 mt-0.5 ${c.met ? "text-green-500" : "text-red-400"}`}>
                    {c.met ? "✓" : "✗"}
                  </span>
                  <span className={c.met ? "text-slate-600" : "text-slate-400"}>{c.criterion}</span>
                </div>
              ))}
              {opp.eligibilityCriteria.length > 3 && (
                <p className="text-xs text-slate-400 pl-4">+{opp.eligibilityCriteria.length - 3} more criteria</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Match bar */}
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${opp.eligibilityMatch >= 80 ? "bg-green-500" : opp.eligibilityMatch >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                    style={{ width: `${opp.eligibilityMatch}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">{opp.eligibilityMatch}% match</span>
              </div>
              <span className="text-xs text-slate-400">{opp.estimatedTimeToApply}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelect(opp)}
                className="text-sm text-blue-600 font-medium hover:underline"
              >
                Pre-fill application →
              </button>
            </div>
          </div>

          {/* Status badge if not just discovered */}
          {opp.status !== "discovered" && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                opp.status === "approved" ? "bg-green-100 text-green-700" :
                opp.status === "submitted" ? "bg-blue-100 text-blue-700" :
                opp.status === "applying" ? "bg-yellow-100 text-yellow-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
              </span>
              {opp.applicationProgress > 0 && (
                <span className="text-xs text-slate-400 ml-2">{opp.applicationProgress}% complete</span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Milestones tab ───────────────────────────────────────────────────────────

function MilestonesTab({ milestones }: { milestones: ReturnType<typeof computeMilestones> }) {
  const achieved = milestones.filter((m) => m.achieved).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-slate-900">Progress</p>
          <p className="text-sm text-slate-500">{achieved} of {milestones.length} achieved</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.round((achieved / milestones.length) * 100)}%` }}
          />
        </div>
      </div>

      {milestones.map((m) => (
        <div
          key={m.id}
          className={`bg-white rounded-xl border p-5 ${m.achieved ? "border-green-200" : "border-slate-200"}`}
        >
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              m.achieved ? "bg-green-500" : "bg-slate-100"
            }`}>
              {m.achieved ? (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xs font-bold text-slate-400">{m.progress}%</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold ${m.achieved ? "text-green-700" : "text-slate-900"}`}>
                {m.label}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{m.description}</p>

              {!m.achieved && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{m.progressLabel}</span>
                    <span>{m.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${m.progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-1">
                {m.unlocks.map((u, i) => (
                  <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${
                    m.achieved ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {m.achieved ? "✓ " : ""}{u}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Weekly digest tab ────────────────────────────────────────────────────────

function DigestTab({
  digest,
  business,
  opportunities,
}: {
  digest: ReturnType<typeof computeWeeklyDigest>;
  business: BusinessProfile;
  opportunities: FundingOpportunity[];
}) {
  const monthlyAvg = business.financials?.monthlyRevenueAvg ?? 0;
  const weeklyAvg = monthlyAvg / 4.3;
  const revenueVsAvg = weeklyAvg > 0
    ? Math.round(((digest.weekRevenue - weeklyAvg) / weeklyAvg) * 100)
    : null;

  const urgentOpps = opportunities.filter(
    (o) => o.applicationDeadline &&
      Math.ceil((new Date(o.applicationDeadline).getTime() - Date.now()) / 86400000) <= 21
  );

  return (
    <div className="space-y-4">
      {/* Win of the week */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-75 mb-2">Win of the week</p>
        <p className="text-base font-medium leading-relaxed">{digest.win}</p>
      </div>

      {/* This week stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-slate-900">${digest.weekRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Revenue this week</p>
          {revenueVsAvg !== null && (
            <p className={`text-xs font-medium mt-1 ${revenueVsAvg >= 0 ? "text-green-600" : "text-red-500"}`}>
              {revenueVsAvg >= 0 ? "+" : ""}{revenueVsAvg}% vs avg
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-slate-900">${digest.weekExpenses.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Expenses this week</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-xl font-bold text-slate-900">{digest.newOpps}</p>
          <p className="text-xs text-slate-400 mt-1">New opportunities</p>
        </div>
      </div>

      {/* Upcoming deadlines */}
      {urgentOpps.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="font-semibold text-slate-900 mb-3">Funding deadlines this month</p>
          <div className="space-y-2">
            {urgentOpps.map((opp) => {
              const days = Math.ceil((new Date(opp.applicationDeadline!).getTime() - Date.now()) / 86400000);
              return (
                <div key={opp.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate flex-1 mr-3">{opp.name}</span>
                  <span className={`text-xs font-medium flex-shrink-0 ${days <= 7 ? "text-red-600" : "text-yellow-600"}`}>
                    {days}d left
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Business snapshot */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="font-semibold text-slate-900 mb-3">Business snapshot</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">YTD revenue</span>
            <span className="font-medium text-slate-900">${(business.financials?.totalRevenueYTD ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Monthly average</span>
            <span className="font-medium text-slate-900">${monthlyAvg.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Profit margin</span>
            <span className="font-medium text-slate-900">{Math.round((business.financials?.profitMargin ?? 0) * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Cash balance</span>
            <span className="font-medium text-slate-900">
              {business.financials?.currentCashBalance != null
                ? `$${business.financials.currentCashBalance.toLocaleString()}`
                : "Connect bank to see"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Application pre-filler modal ────────────────────────────────────────────

function ApplicationModal({
  opportunity,
  business,
  onClose,
  onStatusChange,
}: {
  opportunity: FundingOpportunity;
  business: BusinessProfile;
  onClose: () => void;
  onStatusChange: (status: FundingOpportunity["status"]) => void;
}) {
  const [copied, setCopied] = useState(false);

  // Merge stored prefilledFields with live business data
  const fields: Record<string, string> = {
    "Business Name": business.businessName,
    "Business Type": business.businessType,
    "Entity Type": business.entityType.replace("_", " ").toUpperCase(),
    "State of Formation": business.entityState,
    "City": business.businessAddress?.city ?? "",
    "County": business.businessAddress?.county ?? "",
    "Owner Name": business.ownerName,
    "Owner Email": business.ownerEmail,
    "Owner Phone": business.ownerPhone,
    "Annual Revenue": `$${Math.round((business.financials?.monthlyRevenueAvg ?? 0) * 12).toLocaleString()}`,
    "Monthly Revenue": `$${Math.round(business.financials?.monthlyRevenueAvg ?? 0).toLocaleString()}`,
    "Employee Count": String(business.employeeCount ?? 0),
    "EIN": business.ein ?? "Not yet obtained",
    "Formation Date": business.formationDate ?? "Not yet formed",
    ...opportunity.prefilledFields,
  };

  const needsManual = opportunity.eligibilityCriteria?.filter((c) => !c.met) ?? [];

  const handleCopyAll = async () => {
    const text = Object.entries(fields)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
          <div className="min-w-0 pr-4">
            <h2 className="font-bold text-slate-900 truncate">{opportunity.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{opportunity.provider} · {opportunity.estimatedTimeToApply}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Pre-filled fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-slate-700">Pre-filled from your profile</p>
              <button
                onClick={handleCopyAll}
                className="text-xs text-blue-600 hover:underline"
              >
                {copied ? "Copied!" : "Copy all"}
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-100">
              {Object.entries(fields).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 gap-3">
                  <span className="text-xs text-slate-500 flex-shrink-0">{key}</span>
                  <span className="text-xs font-medium text-slate-900 text-right truncate">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fields needing manual input */}
          {needsManual.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Still needed</p>
              <div className="space-y-1">
                {needsManual.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="text-amber-500 flex-shrink-0 mt-0.5">!</span>
                    <div>
                      <p className="font-medium text-amber-800">{c.criterion}</p>
                      {c.notes && <p className="text-amber-600 mt-0.5">{c.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Repayment terms */}
          {opportunity.repaymentTerms && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">Repayment terms</p>
              <p className="text-xs text-blue-600">{opportunity.repaymentTerms}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-200">
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange("dismissed")}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Not interested
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange("applying")}
              className="px-3 py-2 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Mark as applying
            </button>
            <a
              href={opportunity.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onStatusChange("applying")}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Open application →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
