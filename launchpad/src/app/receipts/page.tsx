"use client";

import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { getReceipts } from "@/services/business-graph";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/Button";
import type { Receipt } from "@/types/financial";

// Disable static prerendering for this page
export const dynamic = "force-dynamic";

export default function ReceiptsPage() {
  const { business } = useBusiness();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | string>("all");

  const load = useCallback(async () => {
    if (!business?.id) return;
    const data = await getReceipts(business.id);
    setReceipts(data);
    setLoading(false);
  }, [business?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <AILoadingScreen title="Loading receipts" steps={["Fetching receipt data"]} variant="inline" />;
  }

  const categories = [...new Set(receipts.map((r) => r.category))];
  const filtered = filter === "all" ? receipts : receipts.filter((r) => r.category === filter);
  const totalAmount = filtered.reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalDeductible = filtered.reduce((s, r) => s + (r.deductibleAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Receipts</h1>
        <p className="text-white/50 text-sm mt-1">Track and categorize your business expenses</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 mb-1">Total receipts</p>
          <p className="text-2xl font-bold text-white">{filtered.length}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 mb-1">Total amount</p>
          <p className="text-2xl font-bold text-white">${totalAmount.toLocaleString()}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-white/40 mb-1">Deductible</p>
          <p className="text-2xl font-bold text-green-400">${totalDeductible.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
            filter === "all" ? "bg-white/15 text-white border-white/20" : "border-white/15 text-white/60 hover:border-white/30"
          }`}
        >
          All ({receipts.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
              filter === cat ? "bg-white/15 text-white border-white/20" : "border-white/15 text-white/60 hover:border-white/30"
            }`}
          >
            {cat} ({receipts.filter((r) => r.category === cat).length})
          </button>
        ))}
      </div>

      {/* Receipts list */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-xl border border-dashed border-white/15 p-12 text-center">
          <p className="text-white/50 mb-2">No receipts yet</p>
          <p className="text-sm text-white/40">Start scanning receipts to track your expenses</p>
        </div>
      ) : (
        <div className="glass-card divide-y divide-slate-100">
          {filtered.map((receipt) => (
            <div key={receipt.id} className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white">{receipt.vendor}</p>
                <p className="text-xs text-white/40 mt-0.5">{receipt.date}</p>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <p className="font-medium text-white">${receipt.amount.toFixed(2)}</p>
                {receipt.deductibleAmount > 0 && (
                  <p className="text-xs text-[#00CF31]">${receipt.deductibleAmount.toFixed(2)} deductible</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
