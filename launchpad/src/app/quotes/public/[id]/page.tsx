"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/Button";
import type { Quote } from "@/types/quote";

export default function PublicQuotePage() {
  const params = useParams();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuote = async () => {
      try {
        const res = await fetch(`/api/quotes/${params.id}`);
        if (!res.ok) throw new Error("Quote not found");
        const data = await res.json();
        setQuote(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quote");
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [params.id]);

  if (loading) {
    return <LoadingScreen title="Loading quote" steps={["Fetching quote details"]} variant="inline" />;
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error || "Quote not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-lg">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Quote</h1>
            <p className="text-slate-500">For {quote.clientName}</p>
          </div>

          <div className="space-y-6">
            {/* Services */}
            <div className="border-b border-slate-200 pb-6">
              <h2 className="font-semibold text-slate-900 mb-3">Services</h2>
              <div className="space-y-3">
                {Array.isArray(quote.services) && quote.services.map((service: Record<string, unknown>, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-slate-600">{String(service.description ?? "Service")}</span>
                    <span className="font-medium text-slate-900">${Number(service.amount ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">${quote.subtotal.toFixed(2)}</span>
              </div>
              {quote.taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax ({(quote.taxRate * 100).toFixed(1)}%)</span>
                  <span className="font-medium text-slate-900">${quote.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold border-t border-slate-200 pt-3">
                <span>Total</span>
                <span className="text-green-700">${quote.total.toFixed(2)}</span>
              </div>
            </div>

            {/* CTA */}
            {quote.paymentUrl && (
              <div className="pt-4">
                <Button
                  onClick={() => window.location.href = quote.paymentUrl!}
                  className="w-full py-3 text-base"
                >
                  Accept & Pay
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
