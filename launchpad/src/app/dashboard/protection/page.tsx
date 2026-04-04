"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/context/BusinessContext";
import { getContracts } from "@/services/business-graph";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import type { Contract } from "@/types/contract";

const riskColors = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
  critical: "bg-red-200 text-red-800",
};

const statusColors = {
  active: "bg-green-100 text-green-700",
  expiring_soon: "bg-yellow-100 text-yellow-700",
  expired: "bg-red-100 text-red-700",
  draft: "bg-slate-100 text-slate-600",
  under_review: "bg-blue-100 text-blue-700",
};

export default function ProtectionPage() {
  const { business } = useBusiness();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    getContracts(business.id).then(setContracts).finally(() => setLoading(false));
  }, [business?.id]);

  if (loading) return <AILoadingScreen title="Loading contracts" steps={["Fetching contracts", "Checking expiry dates", "Scanning obligations"]} variant="inline" />;

  const upcoming = contracts
    .filter((c) => c.autoRenewalDate || c.expirationDate)
    .sort((a, b) => {
      const aDate = a.autoRenewalDate ?? a.expirationDate ?? "";
      const bDate = b.autoRenewalDate ?? b.expirationDate ?? "";
      return aDate.localeCompare(bDate);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contract Vault</h1>
          <p className="text-slate-500 text-sm mt-1">{contracts.length} contract{contracts.length !== 1 ? "s" : ""} · Am I Protected?</p>
        </div>
        <Link
          href="/contracts"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Upload contract
        </Link>
      </div>

      {/* Upcoming deadlines */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Upcoming deadlines</h2>
          <div className="space-y-2">
            {(() => {
              const now = new Date();
              return upcoming.map((c) => {
                const date = c.autoRenewalDate ?? c.expirationDate;
                const days = date ? Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000) : null;
              return (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{c.counterpartyName}</span>
                  <span className={`text-xs font-medium ${days !== null && days <= 14 ? "text-red-600" : "text-slate-500"}`}>
                    {c.autoRenewalDate ? "Auto-renews" : "Expires"} {days !== null ? `in ${days}d` : date}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contract list */}
      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500 mb-4">No contracts yet. Upload your first contract to get AI-powered analysis.</p>
          <Link href="/contracts" className="text-blue-600 text-sm font-medium hover:underline">
            Upload a contract →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <Link key={c.id} href={`/contracts/${c.id}`} className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{c.counterpartyName}</p>
                  <p className="text-sm text-slate-500 capitalize">{c.contractType.replace("_", " ")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {c.analysis?.riskLevel && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${riskColors[c.analysis.riskLevel]}`}>
                      {c.analysis.riskLevel} risk
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}>
                    {c.status.replace("_", " ")}
                  </span>
                </div>
              </div>
              {c.monthlyValue && (
                <p className="text-xs text-slate-400 mt-2">${c.monthlyValue.toLocaleString()}/mo</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
