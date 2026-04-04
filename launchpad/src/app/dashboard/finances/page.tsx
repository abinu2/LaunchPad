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
  accounts: { account_id: string; name: string; type: string; subtype: string | null; mask: string | null; balances: { current: number | null; available: number | null } }[];
  lastSyncedAt: string | null;
  status: string;
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function groupByMonth(
  quotes: Quote[],
  receipts: Receipt[],
  bankTxs: PlaidTransaction[]
) {
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

  // Bank transactions: negative amount = credit (inflow), positive = debit (outflow)
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

// ─── component ───────────────────────────────────────────────────────────────

export default function FinancesPage() {
  const { business } = useBusiness();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [bankTxs, setBankTxs] = useState<PlaidTransaction[]>([]);
  const [connections, setConnections] = useState<PlaidConn[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "transactions" | "accounts">("overview");

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

  // YTD from all sources
  const ytdRevenue =
    quotes.filter((q) => q.status === "paid").reduce((s, q) => s + q.total, 0) +
    bankTxs.filter((t) => !t.pending && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const ytdExpenses =
    receipts.reduce((s, r) => s + (r.deductibleAmount ?? r.amount), 0) +
    bankTxs.filter((t) => !t.pending && t.amount > 0).reduce((s, t) => s + t.amount, 0);

  const totalBalance = connections
    .flatMap((c) => c.accounts)
    .filter((a) => a.type === "depository")
    .reduce((s, a) => s + (a.balances.current ?? 0), 0);

  // Expense breakdown combining receipts + bank
  const expensesByCategory: Record<string, number> = {};
  receipts.forEach((r) => {
    expensesByCategory[r.category] = (expensesByCategory[r.category] ?? 0) + r.amount;
  });
  bankTxs.filter((t) => !t.pending && t.amount > 0).forEach((t) => {
    const cat = categorizeBankTx(t);
    expensesByCategory[cat] = (expensesByCategory[cat] ?? 0) + t.amount;
  });

  const hasBank = connections.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finances</h1>
          <p className="text-slate-500 text-sm mt-1">Am I Keeping Enough Money?</p>
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
          {business?.id && (
            <PlaidConnectButton businessId={business.id} onSuccess={load} />
          )}
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
            <p className="font-semibold text-blue-900">Connect your bank for real-time P&L</p>
            <p className="text-sm text-blue-700 mt-1">
              Link your business checking account to automatically track income and expenses. Uses Plaid — the same technology trusted by Venmo and Robinhood.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {(["overview", "transactions", "accounts"] as const).map((tab) => (
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
        <div className="space-y-4">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard label="Cash balance" value={`$${totalBalance.toLocaleString()}`} sub={hasBank ? "across linked accounts" : "connect bank to see"} color="blue" />
            <KPICard label="YTD revenue" value={`$${Math.round(ytdRevenue).toLocaleString()}`} color="green" />
            <KPICard label="YTD expenses" value={`$${Math.round(ytdExpenses).toLocaleString()}`} color="red" />
            <KPICard
              label="YTD profit"
              value={`$${Math.round(ytdRevenue - ytdExpenses).toLocaleString()}`}
              color={ytdRevenue - ytdExpenses >= 0 ? "green" : "red"}
              sub={ytdRevenue > 0 ? `${Math.round(((ytdRevenue - ytdExpenses) / ytdRevenue) * 100)}% margin` : undefined}
            />
          </div>

          {/* Bar chart */}
          {monthlyData.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-4">Revenue vs. Expenses — last 6 months</h2>
              <div className="flex items-end gap-3" style={{ height: "120px" }}>
                {monthlyData.map((m) => (
                  <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: "96px" }}>
                      <div className="flex-1 bg-blue-400 rounded-t transition-all" style={{ height: `${(m.revenue / maxVal) * 96}px` }} title={`Revenue: $${Math.round(m.revenue)}`} />
                      <div className="flex-1 bg-red-300 rounded-t transition-all" style={{ height: `${(m.expenses / maxVal) * 96}px` }} title={`Expenses: $${Math.round(m.expenses)}`} />
                    </div>
                    <span className="text-xs text-slate-400">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-sm inline-block" /> Revenue</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-300 rounded-sm inline-block" /> Expenses</span>
              </div>
            </div>
          )}

          {/* Expense breakdown */}
          {Object.keys(expensesByCategory).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Expenses by category</h2>
              <div className="space-y-2">
                {Object.entries(expensesByCategory)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([cat, amount]) => {
                    const pct = ytdExpenses > 0 ? Math.round((amount / ytdExpenses) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-slate-600 capitalize">{cat.replace(/_/g, " ")}</span>
                          <span className="font-medium text-slate-900">${Math.round(amount).toLocaleString()} <span className="text-slate-400 font-normal text-xs">({pct}%)</span></span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {monthlyData.length === 0 && !hasBank && (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
              <p className="text-slate-500 mb-2">No financial data yet.</p>
              <p className="text-sm text-slate-400">Connect your bank or scan receipts to see your P&L.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSACTIONS TAB ── */}
      {activeTab === "transactions" && (
        <div className="space-y-3">
          {bankTxs.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <p className="text-slate-500">No bank transactions yet.</p>
              <p className="text-sm text-slate-400 mt-1">Connect your bank account to see transactions here.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{bankTxs.length} transactions from the last 90 days</p>
              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                {bankTxs.slice(0, 50).map((tx) => (
                  <div key={tx.transaction_id} className="flex items-center justify-between px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{tx.merchant_name ?? tx.name}</p>
                      <p className="text-xs text-slate-400">{tx.date} · {tx.personal_finance_category?.primary?.replace(/_/g, " ").toLowerCase() ?? "uncategorized"}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0 text-right">
                      <p className={`text-sm font-semibold ${tx.amount < 0 ? "text-green-600" : "text-slate-900"}`}>
                        {tx.amount < 0 ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                      </p>
                      {tx.pending && <p className="text-xs text-slate-400">Pending</p>}
                    </div>
                  </div>
                ))}
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
                      {conn.lastSyncedAt ? `Last synced ${new Date(conn.lastSyncedAt).toLocaleDateString()}` : "Never synced"}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conn.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
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
                      <span className="font-medium text-slate-900">
                        {acct.balances.current !== null ? `$${acct.balances.current.toLocaleString()}` : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          {connections.length > 0 && business?.id && (
            <PlaidConnectButton businessId={business.id} onSuccess={load} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              + Add another account
            </PlaidConnectButton>
          )}
        </div>
      )}

      <p className="text-xs text-slate-400 text-center">
        Estimated for planning purposes. Consult a tax professional for filing.
      </p>
    </div>
  );
}

function KPICard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: "blue" | "green" | "red" }) {
  const colors = { blue: "text-blue-700", green: "text-green-700", red: "text-red-700" };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
