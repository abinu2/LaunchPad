"use client";

import { useCallback, useEffect, useState } from "react";
import { PlaidConnectButton } from "@/components/plaid/PlaidConnectButton";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import { useBusiness } from "@/context/BusinessContext";
import { summarizeBankCash, summarizeFinances } from "@/lib/finance";
import { getBankTransactions, getPlaidConnections, getQuotes, getReceipts } from "@/services/business-graph";
import type { PlaidTransaction } from "@/types/plaid";
import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";

// Disable static prerendering for this page
export const dynamic = "force-dynamic";

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

function fmt(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function categorizeBankTx(tx: PlaidTransaction) {
  const primary = tx.personal_finance_category?.primary ?? "";
  const map: Record<string, string> = {
    FOOD_AND_DRINK: "meals_entertainment",
    TRANSPORTATION: "vehicle_fuel",
    SHOPS: "supplies",
    GENERAL_MERCHANDISE: "supplies",
    GENERAL_SERVICES: "professional_services",
    UTILITIES: "utilities",
    RENT_AND_UTILITIES: "rent",
  };
  return map[primary] ?? "other";
}

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function FinancesPage() {
  const { business } = useBusiness();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [bankTxs, setBankTxs] = useState<PlaidTransaction[]>([]);
  const [connections, setConnections] = useState<PlaidConn[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
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

  useEffect(() => {
    load();
  }, [load]);

  const handlePlaidSuccess = async () => {
    setSyncing(true);
    try {
      await fetch("/api/plaid/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business?.id }),
      });
    } catch {
      // non-blocking
    } finally {
      setSyncing(false);
    }
    await load();
  };

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

  if (loading) {
    return <AILoadingScreen title="Loading finances" steps={["Fetching transactions", "Loading quotes", "Calculating P&L"]} variant="inline" />;
  }

  const finance = summarizeFinances(quotes, receipts);
  const bank = summarizeBankCash(bankTxs);
  const ytdRevenue = finance.paidRevenue;
  const ytdExpenses = finance.deductibleExpenses;
  const ytdProfit = ytdRevenue - ytdExpenses;
  const margin = ytdRevenue > 0 ? Math.round((ytdProfit / ytdRevenue) * 100) : 0;
  const pendingQuotes = quotes.filter((q) => ["sent", "viewed", "accepted"].includes(q.status));
  const totalBalance = connections
    .flatMap((c) => c.accounts)
    .filter((a) => a.type === "depository")
    .reduce((sum, a) => sum + (a.balances.current ?? 0), 0);
  const monthlyBurnRate = finance.averageMonthlyExpenses;
  const runway = monthlyBurnRate > 0 && totalBalance > 0 ? Math.floor(totalBalance / monthlyBurnRate) : null;
  const taxReserve = ytdProfit > 0 ? Math.round(ytdProfit * 0.3) : 0;
  const filteredTxs = txSearch
    ? bankTxs.filter((tx) => (tx.merchant_name ?? tx.name).toLowerCase().includes(txSearch.toLowerCase()))
    : bankTxs;

  const expenseMix: Record<string, number> = {};
  receipts.forEach((receipt) => {
    expenseMix[receipt.category] = (expenseMix[receipt.category] ?? 0) + (receipt.deductibleAmount ?? receipt.amount);
  });
  bankTxs.filter((tx) => !tx.pending && tx.amount > 0).forEach((tx) => {
    const category = categorizeBankTx(tx);
    expenseMix[category] = (expenseMix[category] ?? 0) + tx.amount;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Finances</h1>
          <p className="text-white/50 text-sm mt-1">Operating performance from quotes and receipts, with cash insight from Plaid.</p>
        </div>
        <div className="flex items-center gap-2">
          {connections.length > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white/70 border border-white/15 rounded-lg hover:bg-white/8 hover:text-white disabled:opacity-50 transition-colors"
            >
              {syncing ? "Syncing..." : "Sync"}
            </button>
          )}
          {business?.id && <PlaidConnectButton businessId={business.id} onSuccess={handlePlaidSuccess} />}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Cash balance" value={connections.length > 0 ? `$${fmt(totalBalance)}` : "--"} sub={connections.length > 0 ? "linked accounts" : "connect bank to see"} />
        <KPICard label="Collected revenue" value={`$${fmt(Math.round(ytdRevenue))}`} />
        <KPICard label="Deductible expenses" value={`$${fmt(Math.round(ytdExpenses))}`} />
        <KPICard label="Operating profit" value={`$${fmt(Math.round(ytdProfit))}`} sub={ytdRevenue > 0 ? `${margin}% margin` : undefined} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Meaningful insight</h2>
          <div className="space-y-3 text-sm">
            <p className="text-white/70">
              {ytdProfit > 0
                ? `You have kept about $${fmt(Math.round(ytdProfit))} after deductible expenses.`
                : "Your current data shows expenses meeting or exceeding collected revenue."}
            </p>
            <p className="text-white/70">
              {pendingQuotes.length > 0
                ? `$${fmt(Math.round(finance.pendingIncome))} is still outstanding across ${finance.pendingQuoteCount} quote${finance.pendingQuoteCount !== 1 ? "s" : ""}.`
                : "There is no pending quote revenue waiting to be collected right now."}
            </p>
            <p className="text-white/70">
              {taxReserve > 0
                ? `Setting aside roughly $${fmt(taxReserve)} for taxes would keep you closer to pace.`
                : "Tax reserve pressure looks light until profit becomes positive."}
            </p>
            <p className="text-white/40 text-xs">
              Operating metrics here intentionally avoid counting bank inflows/outflows as revenue or expenses when the same activity is already reflected in quotes or receipts.
            </p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Cash and tax signals</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">Average monthly revenue</span>
              <span className="font-medium text-white">${fmt(Math.round(finance.averageMonthlyRevenue))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Average monthly expenses</span>
              <span className="font-medium text-white">${fmt(Math.round(finance.averageMonthlyExpenses))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Average monthly profit</span>
              <span className="font-medium text-white">${fmt(Math.round(finance.averageMonthlyProfit))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Estimated tax reserve</span>
              <span className="font-medium text-red-400">${fmt(taxReserve)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Cash runway</span>
              <span className="font-medium text-white">{runway !== null ? `${runway} month${runway !== 1 ? "s" : ""}` : "--"}</span>
            </div>
            <div className="pt-2 border-t border-white/8 text-xs text-white/30">
              Bank snapshot: ${fmt(Math.round(bank.inflow))} in / ${fmt(Math.round(bank.outflow))} out.
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Recent operating months</h2>
          {finance.monthlyData.length === 0 ? (
            <p className="text-sm text-white/40">Create paid quotes or scan receipts to populate this view.</p>
          ) : (
            <div className="space-y-2">
              {[...finance.monthlyData].reverse().map((month) => (
                <div key={month.month} className="grid grid-cols-4 text-sm">
                  <span className="text-white/50">{new Date(`${month.month}-01`).toLocaleString("default", { month: "short", year: "numeric" })}</span>
                  <span className="text-right text-[#00CF31]">${fmt(Math.round(month.revenue))}</span>
                  <span className="text-right text-red-400">${fmt(Math.round(month.expenses))}</span>
                  <span className={`text-right font-medium ${month.profit >= 0 ? "text-emerald-400" : "text-orange-400"}`}>{month.profit >= 0 ? "+" : ""}${fmt(Math.round(month.profit))}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Expense mix</h2>
          {Object.keys(expenseMix).length === 0 ? (
            <p className="text-sm text-white/40">Scan receipts or sync transactions to see categories.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(expenseMix)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 8)
                .map(([category, amount]) => {
                  const pct = ytdExpenses > 0 ? Math.round((amount / ytdExpenses) * 100) : 0;
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/60 capitalize">{category.replace(/_/g, " ")}</span>
                        <span className="font-medium text-white">${fmt(Math.round(amount))} <span className="text-white/40 text-xs">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-[#00CF31]/60 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white">Bank transactions</h2>
          <input
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full max-w-xs h-9 px-3 text-sm bg-white/8 border border-white/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00CF31]/40 text-white placeholder:text-white/30"
          />
        </div>
        {filteredTxs.length === 0 ? (
          <p className="text-sm text-white/40">No matching transactions.</p>
        ) : (
          <div className="divide-y divide-white/8">
            {filteredTxs.slice(0, 100).map((tx) => (
              <div key={tx.transaction_id} className="flex items-center justify-between py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{tx.merchant_name ?? tx.name}</p>
                  <p className="text-xs text-white/40">
                    {tx.date}
                    {tx.personal_finance_category?.primary && ` | ${tx.personal_finance_category.primary.replace(/_/g, " ").toLowerCase()}`}
                    {tx.payment_channel && ` | ${tx.payment_channel}`}
                  </p>
                </div>
                <span className={`font-medium ${tx.amount < 0 ? "text-[#00CF31]" : "text-white/70"}`}>
                  {tx.amount < 0 ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
