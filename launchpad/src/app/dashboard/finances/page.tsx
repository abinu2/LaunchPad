"use client";

import { useEffect, useState, useCallback } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { getQuotes, getReceipts, getPlaidConnections, getBankTransactions } from "@/services/business-graph";
import { PlaidConnectButton } from "@/components/plaid/PlaidConnectButton";
import { Spinner } from "@/components/ui/Spinner";
import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";
import type { PlaidTransaction } from "@/types/plaid";

type PlaidConn = {
  itemId: string;
  institutionName: string;
  accounts: {
    account_id: string;
    name: string;
    type: string;
    subtype: string | null;
    mask: string | null;
    balances: { current: number | null; available: number | null };
  }[];
  lastSyncedAt: string | null;
  status: string;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function groupByMonth(quotes: Quote[], receipts: Receipt[], bankTxs: PlaidTransaction[]) {
  const months: Record<string, { revenue: number; expenses: number }> = {};

  const add = (key: string, field: "revenue" | "expenses", amount: number) => {
    if (!months[key]) months[key] = { revenue: 0, expenses: 0 };
    months[key][field] += amount;
  };

  quotes.filter((q) => q.status === "paid").forEach((q) => {
    const d = q.paidAt ? new Date(q.paidAt) : new Date();
    add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, "revenue", q.total);
  });

  receipts.forEach((r) => {
    add(r.date.slice(0, 7), "expenses", r.deductibleAmount ?? r.amount);
  });

  bankTxs.filter((t) => !t.pending).forEach((t) => {
    const key = t.date.slice(0, 7);
    if (t.amount < 0) add(key, "revenue", Math.abs(t.amount));
    else add(key, "expenses", t.amount);
  });

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      label: new Date(month + "-01").toLocaleString("default", { month: "short" }),
      ...data,
      profit: data.revenue - data.expenses,
    }));
}

function categorizeBankTx(tx: PlaidTransaction): string {
  const primary = tx.personal_finance_category?.primary ?? "";
  const map: Record<string, string> = {
    FOOD_AND_DRINK: "meals_entertainment",
    TRANSPORTATION: "vehicle_fuel",
    SHOPS: "supplies",
    GENERAL_MERCHANDISE: "supplies",
    GENERAL_SERVICES: "professional_services",
    UTILITIES: "utilities",
    RENT_AND_UTILITIES: "rent",
    ENTERTAINMENT: "meals_entertainment",
    PERSONAL_CARE: "other",
    MEDICAL: "other",
    TRAVEL: "other",
  };
  return map[primary] ?? "other";
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string; color: "blue" | "green" | "red" | "slate";
}) {
  const colors = {
    blue: "text-blue-700",
    green: "text-green-700",
    red: "text-red-700",
    slate: "text-slate-700",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function InsightCard({
  icon, label, value, sub, color, detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: "green" | "yellow" | "red" | "blue" | "slate";
  detail?: string;
}) {
  const bg = {
    green: "bg-green-50 border-green-200",
    yellow: "bg-yellow-50 border-yellow-200",
    red: "bg-red-50 border-red-200",
    blue: "bg-blue-50 border-blue-200",
    slate: "bg-slate-50 border-slate-200",
  }[color];
  const text = {
    green: "text-green-800",
    yellow: "text-yellow-800",
    red: "text-red-700",
    blue: "text-blue-800",
    slate: "text-slate-700",
  }[color];
  const subText = {
    green: "text-green-600",
    yellow: "text-yellow-700",
    red: "text-red-600",
    blue: "text-blue-600",
    slate: "text-slate-500",
  }[color];

  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${text}`}>{icon}</div>
        <div className="min-w-0">
          <p className={`text-xs font-medium uppercase tracking-wide ${subText}`}>{label}</p>
          <p className={`text-lg font-bold mt-0.5 ${text}`}>{value}</p>
          {sub && <p className={`text-xs mt-0.5 ${subText}`}>{sub}</p>}
          {detail && <p className={`text-xs mt-1 ${subText} opacity-80`}>{detail}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const { business } = useBusiness();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [bankTxs, setBankTxs] = useState<PlaidTransaction[]>([]);
  const [connections, setConnections] = useState<PlaidConn[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "insights" | "transactions" | "accounts">("overview");
  const [txSearch, setTxSearch] = useState("");

  const load = useCallback(async () => {
    if (!business?.id) return;
    const [q, r, conns, txs] = await Promise.all([
      getQuotes(business.id),
      getReceipts(business.id),
      getPlaidConnections(business.id),
      getBankTransactions(business.id),
    ]);
    setQuotes(q);
    setReceipts(r);
    setConnections(conns);
    setBankTxs(txs);
    setLoading(false);
  }, [business?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    if (!business?.id) return;
    setSyncing(true);
    try {
      await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      await load();
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  const monthlyData = groupByMonth(quotes, receipts, bankTxs);
  const maxVal = Math.max(...monthlyData.map((m) => Math.max(m.revenue, m.expenses)), 1);

  // ── YTD aggregates ──
  const ytdRevenue =
    quotes.filter((q) => q.status === "paid").reduce((s, q) => s + q.total, 0) +
    bankTxs.filter((t) => !t.pending && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const ytdExpenses =
    receipts.reduce((s, r) => s + (r.deductibleAmount ?? r.amount), 0) +
    bankTxs.filter((t) => !t.pending && t.amount > 0).reduce((s, t) => s + t.amount, 0);

  const ytdProfit = ytdRevenue - ytdExpenses;

  const totalBalance = connections
    .flatMap((c) => c.accounts)
    .filter((a) => a.type === "depository")
    .reduce((s, a) => s + (a.balances.current ?? 0), 0);

  // ── Computed insights ──
  const recentMonths = monthlyData.slice(-3);
  const monthlyBurnRate =
    recentMonths.length > 0
      ? recentMonths.reduce((s, m) => s + m.expenses, 0) / recentMonths.length
      : 0;

  const cashRunwayMonths =
    monthlyBurnRate > 0 && totalBalance > 0
      ? Math.floor(totalBalance / monthlyBurnRate)
      : null;

  const currentMonthData = monthlyData[monthlyData.length - 1];
  const lastMonthData = monthlyData[monthlyData.length - 2];
  const momRevenueChange =
    lastMonthData && lastMonthData.revenue > 0 && currentMonthData
      ? ((currentMonthData.revenue - lastMonthData.revenue) / lastMonthData.revenue) * 100
      : null;

  // Self-employment estimated tax: ~15.3% SE tax + ~12% federal = ~27-30% rule of thumb
  const taxEstimate = ytdProfit > 0 ? Math.round(ytdProfit * 0.30) : 0;
  const now = new Date();
  const quarterDueDates = [
    { q: "Q1", due: new Date(now.getFullYear(), 3, 15) },
    { q: "Q2", due: new Date(now.getFullYear(), 5, 17) },
    { q: "Q3", due: new Date(now.getFullYear(), 8, 15) },
    { q: "Q4", due: new Date(now.getFullYear() + 1, 0, 15) },
  ];
  const nextTaxDue = quarterDueDates.find((d) => d.due > now) ?? quarterDueDates[3];
  const daysUntilTax = Math.ceil((nextTaxDue.due.getTime() - now.getTime()) / 86400000);

  // Outstanding invoices (sent or accepted but not paid)
  const pendingQuotes = quotes.filter((q) => ["sent", "viewed", "accepted"].includes(q.status));
  const pendingValue = pendingQuotes.reduce((s, q) => s + q.total, 0);

  // Top vendors from bank debits
  const vendorSpend: Record<string, number> = {};
  bankTxs.filter((t) => !t.pending && t.amount > 0).forEach((t) => {
    const name = t.merchant_name ?? t.name;
    vendorSpend[name] = (vendorSpend[name] ?? 0) + t.amount;
  });
  const topVendors = Object.entries(vendorSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  // Expense breakdown
  const expensesByCategory: Record<string, number> = {};
  receipts.forEach((r) => {
    expensesByCategory[r.category] = (expensesByCategory[r.category] ?? 0) + r.amount;
  });
  bankTxs.filter((t) => !t.pending && t.amount > 0).forEach((t) => {
    const cat = categorizeBankTx(t);
    expensesByCategory[cat] = (expensesByCategory[cat] ?? 0) + t.amount;
  });

  const hasBank = connections.length > 0;
  const hasData = monthlyData.length > 0 || receipts.length > 0 || quotes.length > 0;

  // Filtered transactions
  const filteredTxs = txSearch
    ? bankTxs.filter((t) =>
        (t.merchant_name ?? t.name).toLowerCase().includes(txSearch.toLowerCase())
      )
    : bankTxs;

  // Profit margin trend: is the last 3 months improving?
  const profitTrend =
    monthlyData.length >= 3
      ? monthlyData.slice(-3).every((m, i, arr) =>
          i === 0 || m.profit >= arr[i - 1].profit
        )
        ? "up"
        : monthlyData.slice(-3).every((m, i, arr) =>
            i === 0 || m.profit <= arr[i - 1].profit
          )
        ? "down"
        : "mixed"
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finances</h1>
          <p className="text-slate-500 text-sm mt-1">Am I keeping enough money?</p>
        </div>
        <div className="flex items-center gap-2">
          {hasBank && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <svg className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {syncing ? "Syncing..." : "Sync"}
            </button>
          )}
          {business?.id && <PlaidConnectButton businessId={business.id} onSuccess={load} />}
        </div>
      </div>

      {/* Bank connection prompt */}
      {!hasBank && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-blue-900">Connect your bank for real-time P&amp;L</p>
            <p className="text-sm text-blue-700 mt-1">
              Link your business checking to automatically track income and expenses. Uses Plaid — trusted by Venmo, Robinhood, and thousands of apps.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(["overview", "insights", "transactions", "accounts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
              activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              label="Cash balance"
              value={hasBank ? `$${fmt(totalBalance)}` : "—"}
              sub={hasBank ? "across linked accounts" : "connect bank to see"}
              color="blue"
            />
            <KPICard label="YTD revenue" value={`$${fmt(Math.round(ytdRevenue))}`} color="green" />
            <KPICard label="YTD expenses" value={`$${fmt(Math.round(ytdExpenses))}`} color="red" />
            <KPICard
              label="YTD profit"
              value={`$${fmt(Math.round(ytdProfit))}`}
              color={ytdProfit >= 0 ? "green" : "red"}
              sub={ytdRevenue > 0 ? `${Math.round((ytdProfit / ytdRevenue) * 100)}% margin` : undefined}
            />
          </div>

          {/* Revenue vs Expenses chart */}
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-900">Revenue vs. Expenses</h2>
                {profitTrend && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    profitTrend === "up" ? "bg-green-100 text-green-700" :
                    profitTrend === "down" ? "bg-red-100 text-red-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    Profit trend: {profitTrend === "up" ? "↑ improving" : profitTrend === "down" ? "↓ declining" : "→ mixed"}
                  </span>
                )}
              </div>
              <div className="flex items-end gap-2" style={{ height: "140px" }}>
                {monthlyData.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: "112px" }}>
                      <div
                        className="flex-1 bg-blue-400 rounded-t transition-all"
                        style={{ height: `${(m.revenue / maxVal) * 112}px` }}
                        title={`Revenue: $${fmt(Math.round(m.revenue))}`}
                      />
                      <div
                        className="flex-1 bg-red-300 rounded-t transition-all"
                        style={{ height: `${(m.expenses / maxVal) * 112}px` }}
                        title={`Expenses: $${fmt(Math.round(m.expenses))}`}
                      />
                      <div
                        className={`flex-1 rounded-t transition-all ${m.profit >= 0 ? "bg-emerald-400" : "bg-orange-400"}`}
                        style={{ height: `${(Math.abs(m.profit) / maxVal) * 112}px` }}
                        title={`Profit: $${fmt(Math.round(m.profit))}`}
                      />
                    </div>
                    <span className="text-xs text-slate-400">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-sm inline-block" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-300 rounded-sm inline-block" /> Expenses</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-sm inline-block" /> Profit</span>
              </div>
            </div>
          )}

          {/* Monthly P&L table */}
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100">
                <h2 className="font-semibold text-slate-900 text-sm">Monthly breakdown</h2>
              </div>
              <div className="divide-y divide-slate-50">
                {[...monthlyData].reverse().map((m) => (
                  <div key={m.month} className="grid grid-cols-4 px-5 py-3 text-sm">
                    <span className="text-slate-500 font-medium">{new Date(m.month + "-01").toLocaleString("default", { month: "long", year: "numeric" })}</span>
                    <span className="text-right text-green-700 font-medium">${fmt(Math.round(m.revenue))}</span>
                    <span className="text-right text-red-600">${fmt(Math.round(m.expenses))}</span>
                    <span className={`text-right font-semibold ${m.profit >= 0 ? "text-emerald-700" : "text-orange-600"}`}>
                      {m.profit >= 0 ? "+" : ""}${fmt(Math.round(m.profit))}
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-4 px-5 py-3 text-sm bg-slate-50 font-semibold">
                  <span className="text-slate-700">YTD Total</span>
                  <span className="text-right text-green-700">${fmt(Math.round(ytdRevenue))}</span>
                  <span className="text-right text-red-600">${fmt(Math.round(ytdExpenses))}</span>
                  <span className={`text-right ${ytdProfit >= 0 ? "text-emerald-700" : "text-orange-600"}`}>
                    {ytdProfit >= 0 ? "+" : ""}${fmt(Math.round(ytdProfit))}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 px-5 py-2 text-xs text-slate-400 bg-slate-50 border-t border-slate-100">
                <span>Month</span>
                <span className="text-right">Revenue</span>
                <span className="text-right">Expenses</span>
                <span className="text-right">Profit</span>
              </div>
            </div>
          )}

          {/* Expense breakdown */}
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Expenses by category</h2>
              <div className="space-y-2.5">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([cat, amount]) => {
                    const pct = ytdExpenses > 0 ? Math.round((amount / ytdExpenses) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600 capitalize">{cat.replace(/_/g, " ")}</span>
                          <span className="font-medium text-slate-900">
                            ${fmt(Math.round(amount))}{" "}
                            <span className="text-slate-400 font-normal text-xs">({pct}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Top vendors */}
          {topVendors.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Top vendors by spend</h2>
              <div className="space-y-2">
                {topVendors.map(([name, amount], i) => {
                  const pct = ytdExpenses > 0 ? Math.round((amount / ytdExpenses) * 100) : 0;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-700 truncate">{name}</span>
                          <span className="font-medium text-slate-900 ml-2 flex-shrink-0">${fmt(Math.round(amount))}</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending income */}
          {pendingQuotes.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-slate-900">Pending income</h2>
                <span className="text-xs text-slate-500 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  ${fmt(Math.round(pendingValue))} outstanding
                </span>
              </div>
              <div className="space-y-2">
                {pendingQuotes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="text-slate-700 font-medium">{q.clientName}</span>
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        q.status === "accepted" ? "bg-green-100 text-green-700" :
                        q.status === "viewed" ? "bg-yellow-100 text-yellow-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{q.status}</span>
                    </div>
                    <span className="font-semibold text-slate-900">${fmt(q.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasData && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <p className="text-slate-500 mb-2">No financial data yet.</p>
              <p className="text-sm text-slate-400">Connect your bank, create quotes, or scan receipts to see your P&amp;L.</p>
            </div>
          )}
        </div>
      )}

      {/* ── INSIGHTS TAB ── */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Derived from your connected data — updated every time you sync.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cash Runway */}
            {cashRunwayMonths !== null ? (
              <InsightCard
                icon={
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                label="Cash runway"
                value={`${cashRunwayMonths} month${cashRunwayMonths !== 1 ? "s" : ""}`}
                sub={`$${fmt(Math.round(totalBalance))} balance ÷ $${fmt(Math.round(monthlyBurnRate))}/mo avg burn`}
                detail={
                  cashRunwayMonths < 2
                    ? "Critical — your cash won't last 2 months at this burn rate."
                    : cashRunwayMonths < 4
                    ? "Tight — aim for at least 3 months of runway."
                    : "Healthy — you have comfortable operating cushion."
                }
                color={cashRunwayMonths < 2 ? "red" : cashRunwayMonths < 4 ? "yellow" : "green"}
              />
            ) : (
              <InsightCard
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                label="Cash runway"
                value="Connect bank"
                sub="Link your bank account to see how long your cash will last."
                color="slate"
              />
            )}

            {/* Tax estimate */}
            <InsightCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              }
              label={`Estimated tax owed (${nextTaxDue.q} due ${nextTaxDue.due.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`}
              value={taxEstimate > 0 ? `$${fmt(taxEstimate)}` : "No profit yet"}
              sub={taxEstimate > 0 ? `~30% of $${fmt(Math.round(ytdProfit))} YTD profit · ${daysUntilTax} days away` : "You owe nothing until you're profitable."}
              detail="Self-employment + federal estimate. Consult a tax professional."
              color={taxEstimate > 0 && daysUntilTax < 30 ? "red" : taxEstimate > 0 ? "yellow" : "green"}
            />

            {/* Month-over-month revenue */}
            <InsightCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
              label="Revenue vs. last month"
              value={
                momRevenueChange !== null
                  ? `${momRevenueChange >= 0 ? "+" : ""}${Math.round(momRevenueChange)}%`
                  : "Not enough data"
              }
              sub={
                currentMonthData && lastMonthData
                  ? `${lastMonthData.label}: $${fmt(Math.round(lastMonthData.revenue))} → ${currentMonthData.label}: $${fmt(Math.round(currentMonthData.revenue))}`
                  : "Need at least 2 months of data."
              }
              detail={
                momRevenueChange !== null
                  ? momRevenueChange > 10
                    ? "Strong growth — keep the momentum."
                    : momRevenueChange > 0
                    ? "Slight growth — consistent is good."
                    : momRevenueChange > -10
                    ? "Slight dip — watch for trends over 3 months."
                    : "Significant revenue drop — review your pipeline."
                  : undefined
              }
              color={
                momRevenueChange === null
                  ? "slate"
                  : momRevenueChange > 5
                  ? "green"
                  : momRevenueChange >= 0
                  ? "blue"
                  : momRevenueChange > -10
                  ? "yellow"
                  : "red"
              }
            />

            {/* Outstanding invoices */}
            <InsightCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
              label="Outstanding invoices"
              value={pendingQuotes.length > 0 ? `$${fmt(Math.round(pendingValue))}` : "All clear"}
              sub={pendingQuotes.length > 0 ? `${pendingQuotes.length} quote${pendingQuotes.length !== 1 ? "s" : ""} awaiting payment` : "No pending invoices — great job collecting!"}
              detail={pendingQuotes.length > 0 ? "Follow up on accepted quotes you haven't collected yet." : undefined}
              color={pendingQuotes.length === 0 ? "green" : pendingValue > 1000 ? "yellow" : "blue"}
            />

            {/* Profit margin */}
            <InsightCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              }
              label="YTD profit margin"
              value={ytdRevenue > 0 ? `${Math.round((ytdProfit / ytdRevenue) * 100)}%` : "—"}
              sub={`$${fmt(Math.round(ytdProfit))} profit on $${fmt(Math.round(ytdRevenue))} revenue`}
              detail={
                ytdRevenue === 0
                  ? "No revenue recorded yet."
                  : ytdProfit / ytdRevenue > 0.30
                  ? "Excellent margin — above 30% is strong for a service business."
                  : ytdProfit / ytdRevenue > 0.15
                  ? "Healthy margin — typical for service businesses is 15–30%."
                  : ytdProfit / ytdRevenue > 0
                  ? "Thin margin — look for ways to reduce expenses or raise prices."
                  : "Negative margin — spending more than you're earning."
              }
              color={
                ytdRevenue === 0
                  ? "slate"
                  : ytdProfit / ytdRevenue > 0.25
                  ? "green"
                  : ytdProfit / ytdRevenue > 0.10
                  ? "blue"
                  : ytdProfit / ytdRevenue > 0
                  ? "yellow"
                  : "red"
              }
            />

            {/* Avg monthly revenue */}
            <InsightCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              }
              label="Avg monthly revenue (last 3 mo)"
              value={
                recentMonths.length > 0
                  ? `$${fmt(Math.round(recentMonths.reduce((s, m) => s + m.revenue, 0) / recentMonths.length))}`
                  : "—"
              }
              sub={recentMonths.length > 0 ? "Based on last 3 months of data" : "Not enough data yet."}
              detail={
                recentMonths.length > 0 && monthlyBurnRate > 0
                  ? `Avg burn: $${fmt(Math.round(monthlyBurnRate))}/mo — net avg: $${fmt(Math.round(recentMonths.reduce((s, m) => s + m.profit, 0) / recentMonths.length))}/mo`
                  : undefined
              }
              color="blue"
            />
          </div>

          <p className="text-xs text-slate-400 text-center pt-2">
            Estimates for planning purposes only. Consult a licensed tax professional for filing.
          </p>
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === "transactions" && (
        <div className="space-y-3">
          {bankTxs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-slate-500">No bank transactions yet.</p>
              <p className="text-sm text-slate-400 mt-1">Connect your bank to see transactions here.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search transactions..."
                    className="w-full pl-9 pr-3 h-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
                <p className="text-sm text-slate-500 flex-shrink-0">
                  {filteredTxs.length} of {bankTxs.length} transactions
                </p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {filteredTxs.slice(0, 100).map((tx) => (
                  <div key={tx.transaction_id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{tx.merchant_name ?? tx.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tx.date}
                        {tx.personal_finance_category?.primary && (
                          <> · <span className="capitalize">{tx.personal_finance_category.primary.replace(/_/g, " ").toLowerCase()}</span></>
                        )}
                        {tx.payment_channel && <> · {tx.payment_channel}</>}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className={`text-sm font-semibold ${tx.amount < 0 ? "text-green-600" : "text-slate-900"}`}>
                        {tx.amount < 0 ? "+" : "−"}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      {tx.pending && <p className="text-xs text-amber-500 font-medium">Pending</p>}
                    </div>
                  </div>
                ))}
                {filteredTxs.length > 100 && (
                  <p className="text-xs text-slate-400 text-center py-3">
                    Showing 100 of {filteredTxs.length} — refine your search to see more.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ACCOUNTS TAB ── */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {connections.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-slate-500 mb-3">No bank accounts connected.</p>
              {business?.id && <PlaidConnectButton businessId={business.id} onSuccess={load} />}
            </div>
          ) : (
            connections.map((conn) => (
              <div key={conn.itemId} className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-slate-900">{conn.institutionName}</p>
                    <p className="text-xs text-slate-400">
                      {conn.lastSyncedAt
                        ? `Last synced ${new Date(conn.lastSyncedAt).toLocaleDateString()}`
                        : "Never synced"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    conn.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {conn.status}
                  </span>
                </div>
                <div className="space-y-2">
                  {conn.accounts.map((acct) => (
                    <div key={acct.account_id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-slate-700">{acct.name}</span>
                        {acct.mask && <span className="text-slate-400 ml-1">···{acct.mask}</span>}
                        <span className="text-xs text-slate-400 ml-2 capitalize">{acct.subtype ?? acct.type}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">
                          {acct.balances.current !== null ? `$${acct.balances.current.toLocaleString()}` : "—"}
                        </p>
                        {acct.balances.available !== null && acct.balances.available !== acct.balances.current && (
                          <p className="text-xs text-slate-400">${acct.balances.available.toLocaleString()} available</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {connections.length > 0 && business?.id && (
            <PlaidConnectButton
              businessId={business.id}
              onSuccess={load}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              + Add another account
            </PlaidConnectButton>
          )}
        </div>
      )}
    </div>
  );
}
