"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/Button";
import type { Quote } from "@/types/quote";

// Disable static prerendering for this page since it requires Auth0 context
export const dynamic = "force-dynamic";

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { business } = useBusiness();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !business) return;

    const loadQuote = async () => {
      try {
        const res = await fetch(`/api/quotes/${params.id}`);
        if (!res.ok) throw new Error("Failed to load quote");
        const data = await res.json();
        setQuote(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quote");
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, [user, business, params.id]);

  if (loading) {
    return <LoadingScreen title="Loading quote" steps={["Fetching quote details"]} variant="inline" />;
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error || "Quote not found"}</p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Quote for {quote.clientName}</h1>
            <p className="text-slate-500">Quote ID: {quote.id}</p>
          </div>

          <div className="space-y-6">
            {/* Client info */}
            <div className="border-b border-slate-200 pb-6">
              <h2 className="font-semibold text-slate-900 mb-3">Client Information</h2>
              <div className="space-y-2 text-sm">
                <p><span className="text-slate-500">Name:</span> <span className="font-medium">{quote.clientName}</span></p>
                {quote.clientEmail && <p><span className="text-slate-500">Email:</span> <span className="font-medium">{quote.clientEmail}</span></p>}
                {quote.clientPhone && <p><span className="text-slate-500">Phone:</span> <span className="font-medium">{quote.clientPhone}</span></p>}
              </div>
            </div>

            {/* Services */}
            <div className="border-b border-slate-200 pb-6">
              <h2 className="font-semibold text-slate-900 mb-3">Services</h2>
              <div className="space-y-2">
                {Array.isArray(quote.services) && (quote.services as any[]).map((service: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-slate-600">{String(service.description ?? "Service")}</span>
                    <span className="font-medium text-slate-900">${Number(service.amount ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="space-y-2">
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
              <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                <span>Total</span>
                <span className="text-green-700">${quote.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Status */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              <p className="text-sm font-medium text-slate-900 capitalize">{quote.status}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button onClick={() => router.back()} variant="secondary">
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
