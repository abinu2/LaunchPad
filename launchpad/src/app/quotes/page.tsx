"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { getQuotes, updateQuote } from "@/services/business-graph";
import { Spinner } from "@/components/ui/Spinner";
import { QuoteCreateModal } from "@/components/quotes/QuoteCreateModal";
import type { Quote } from "@/types/quote";

const STATUS_COLORS: Record<string, string> = {
  draft:    "bg-slate-100 text-slate-600",
  sent:     "bg-blue-100 text-blue-700",
  viewed:   "bg-yellow-100 text-yellow-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired:  "bg-slate-100 text-slate-500",
  invoiced: "bg-purple-100 text-purple-700",
  paid:     "bg-green-200 text-green-800",
};

export default function QuotesPage() {
  const { business } = useBusiness();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    if (!business?.id) return;
    const q = await getQuotes(business.id);
    setQuotes(q);
    setLoading(false);
  };

  useEffect(() => { load(); }, [business?.id]);

  const markPaid = async (quote: Quote) => {
    if (!business?.id) return;
    await updateQuote(business.id, quote.id, { status: "paid", paymentMethod: "cash" });
    setQuotes((prev) => prev.map((q) => q.id === quote.id ? { ...q, status: "paid" } : q));
  };

  const filtered = filter === "all" ? quotes : quotes.filter((q) => q.status === filter);

  const stats = {
    total: quotes.length,
    pending: quotes.filter((q) => ["sent", "viewed"].includes(q.status)).length,
    accepted: quotes.filter((q) => ["accepted", "invoiced"].includes(q.status)).length,
    revenue: quotes.filter((q) => q.status === "paid").reduce((s, q) => s + q.total, 0),
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
          <p className="text-slate-500 text-sm mt-1">Quote-to-cash engine</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Quote
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Pending", value: stats.pending },
          { label: "Accepted", value: stats.accepted },
          { label: "Revenue", value: `$${stats.revenue.toLocaleString()}` },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {["all", "draft", "sent", "viewed", "accepted", "paid", "declined"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
              filter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Quote list */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500 mb-4">
            {filter === "all" ? "No quotes yet. Create your first one." : `No ${filter} quotes.`}
          </p>
          {filter === "all" && (
            <button onClick={() => setShowCreate(true)} className="text-blue-600 text-sm font-medium hover:underline">
              Create a quote →
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {filtered.map((quote) => (
            <div key={quote.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{quote.clientName}</p>
                <p className="text-xs text-slate-500 truncate">
                  {quote.services.map((s) => s.serviceName).join(", ")}
                </p>
                {quote.scheduledDate && (
                  <p className="text-xs text-slate-400">{quote.scheduledDate}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-slate-900">${quote.total.toLocaleString()}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[quote.status] ?? "bg-slate-100 text-slate-600"}`}>
                  {quote.status}
                </span>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {/* Copy link */}
                {["sent", "viewed", "accepted"].includes(quote.status) && (
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/quotes/public/${quote.id}?businessId=${business?.id}`)}
                    title="Copy client link"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                )}
                {/* Mark paid */}
                {["accepted", "invoiced"].includes(quote.status) && (
                  <button
                    onClick={() => markPaid(quote)}
                    title="Mark as paid"
                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && business && (
        <QuoteCreateModal
          business={business}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
