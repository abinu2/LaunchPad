"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/context/BusinessContext";
import { getContracts } from "@/services/business-graph";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import type { Contract } from "@/types/contract";

// Disable static prerendering for this page
export const dynamic = "force-dynamic";

const riskColors = {
  low: "bg-green-500/15 text-green-400 border border-green-500/20",
  medium: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  high: "bg-red-500/15 text-red-400 border border-red-500/20",
  critical: "bg-red-500/25 text-red-300 border border-red-500/30",
};

const statusColors = {
  active: "bg-green-500/15 text-green-400 border border-green-500/20",
  expiring_soon: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  expired: "bg-red-500/15 text-red-400 border border-red-500/20",
  draft: "bg-white/10 text-white/60 border border-white/10",
  under_review: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
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
          <h1 className="text-2xl font-bold text-white">Contract Vault</h1>
          <p className="text-white/50 text-sm mt-1">{contracts.length} contract{contracts.length !== 1 ? "s" : ""} · Am I Protected?</p>
        </div>
        <Link
          href="/contracts"
          className="px-4 py-2 bg-[#00CF31] text-black text-sm font-semibold rounded-lg hover:bg-[#00b82c] transition-colors"
        >
          Upload contract
        </Link>
      </div>

      {/* Upcoming deadlines */}
      {upcoming.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h2 className="font-semibold text-white mb-3">Upcoming deadlines</h2>
          <div className="space-y-2">
            {(() => {
              const now = new Date();
              return upcoming.map((c) => {
                const date = c.autoRenewalDate ?? c.expirationDate;
                const days = date ? Math.ceil((new Date(date).getTime() - now.getTime()) / 86400000) : null;
                return (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="text-white/70">{c.counterpartyName}</span>
                    <span className={`text-xs font-medium ${days !== null && days <= 14 ? "text-red-400" : "text-white/50"}`}>
                      {c.autoRenewalDate ? "Auto-renews" : "Expires"} {days !== null ? `in ${days}d` : date}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Contract list */}
      {contracts.length === 0 ? (
        <div className="glass-card rounded-xl border-dashed p-12 text-center">
          <p className="text-white/50 mb-4">No contracts yet. Upload your first contract to get AI-powered analysis.</p>
          <Link href="/contracts" className="text-[#00CF31] text-sm font-medium hover:underline">
            Upload a contract →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((c) => (
            <Link key={c.id} href={`/contracts/${c.id}`} className="block glass-card rounded-xl p-4 hover:border-[#00CF31]/30 hover:shadow-lg transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{c.counterpartyName}</p>
                  <p className="text-sm text-white/50 capitalize">{c.contractType.replace("_", " ")}</p>
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
                <p className="text-xs text-white/40 mt-2">${c.monthlyValue.toLocaleString()}/mo</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
