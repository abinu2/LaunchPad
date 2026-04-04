"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/context/BusinessContext";
import { getContracts } from "@/services/business-graph";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Badge } from "@/components/ui/Badge";
import { ContractUploadZone } from "@/components/contracts/ContractUploadZone";
import { GenerateContractModal } from "@/components/contracts/GenerateContractModal";
import { SiteNav } from "@/components/ui/SiteNav";
import type { Contract } from "@/types/contract";

// ─── helpers ─────────────────────────────────────────────────────────────────

const riskVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

const statusVariant: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  expiring_soon: "warning",
  expired: "danger",
  draft: "neutral",
  under_review: "info",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function DeadlineBar({ contracts }: { contracts: Contract[] }) {
  const deadlines = contracts
    .flatMap((c) => {
      const items = [];
      if (c.autoRenewalDate) {
        const d = daysUntil(c.autoRenewalDate);
        if (d !== null && d >= 0 && d <= 60)
          items.push({ label: `${c.counterpartyName} auto-renews`, days: d, type: "renewal" as const, id: c.id });
      }
      if (c.expirationDate) {
        const d = daysUntil(c.expirationDate);
        if (d !== null && d >= 0 && d <= 60)
          items.push({ label: `${c.counterpartyName} expires`, days: d, type: "expiry" as const, id: c.id });
      }
      return items;
    })
    .sort((a, b) => a.days - b.days);

  if (deadlines.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
        Upcoming deadlines
      </p>
      <div className="space-y-2">
        {deadlines.map((d, i) => (
          <Link key={i} href={`/contracts/${d.id}`} className="flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.days <= 14 ? "bg-red-400" : "bg-yellow-400"}`} />
              <span className="text-sm text-slate-700 group-hover:text-blue-600 transition-colors">
                {d.label}
              </span>
            </div>
            <span className={`text-xs font-medium ${d.days <= 14 ? "text-red-600" : "text-slate-500"}`}>
              {d.days === 0 ? "Today" : `${d.days}d`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

type SortKey = "date" | "expiry" | "value" | "risk";
type FilterStatus = "all" | Contract["status"];

export default function ContractsPage() {
  const { business } = useBusiness();
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  useEffect(() => {
    if (!business?.id) return;
    let cancelled = false;

    void getContracts(business.id).then((data) => {
      if (cancelled) return;
      setContracts(data);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [business]);

  const handleUploadComplete = (contractId: string) => {
    setShowUpload(false);
    router.push(`/contracts/${contractId}`);
  };

  const sorted = [...contracts]
    .filter((c) => filterStatus === "all" || c.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "date") return 0; // already ordered by uploadedAt desc from Firestore
      if (sortBy === "expiry") return (a.expirationDate ?? "9999").localeCompare(b.expirationDate ?? "9999");
      if (sortBy === "value") return (b.monthlyValue ?? 0) - (a.monthlyValue ?? 0);
      if (sortBy === "risk") {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.analysis?.riskLevel ?? "low"] ?? 3) - (order[b.analysis?.riskLevel ?? "low"] ?? 3);
      }
      return 0;
    });

  const totalMonthlyValue = contracts
    .filter((c) => c.status === "active")
    .reduce((s, c) => s + (c.monthlyValue ?? 0), 0);

  if (loading) return (
    <LoadingScreen
      title="Loading contracts"
      subtitle="Fetching your contract vault"
      steps={["Loading contracts", "Checking expiration dates", "Scanning obligations"]}
    />
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteNav />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Contract Vault</h1>
            <p className="text-slate-500 text-sm mt-1">
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
              {totalMonthlyValue > 0 && ` · $${totalMonthlyValue.toLocaleString()}/mo active value`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowGenerate(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-700 border border-slate-300 bg-white rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload & Analyze
            </button>
          </div>
        </div>

        {/* Deadline bar */}
        <DeadlineBar contracts={contracts} />

        {/* Filters + sort */}
        {contracts.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
              {(["all", "active", "expiring_soon", "expired", "draft"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                    filterStatus === s
                      ? "bg-slate-900 text-white"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-xs text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="date">Sort: Date added</option>
              <option value="expiry">Sort: Expiry date</option>
              <option value="value">Sort: Monthly value</option>
              <option value="risk">Sort: Risk level</option>
            </select>
          </div>
        )}

        {/* Contract list */}
        {sorted.length === 0 && !showUpload ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-16 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium mb-1">No contracts yet</p>
            <p className="text-slate-400 text-sm mb-5">Upload a contract to get AI-powered clause analysis, risk scoring, and obligation tracking.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Upload your first contract
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((c) => (
              <ContractCard key={c.id} contract={c} />
            ))}
          </div>
        )}

        {/* Upload zone inline */}
        {showUpload && business?.id && (
          <ContractUploadZone
            businessId={business.id}
            onComplete={handleUploadComplete}
            onCancel={() => setShowUpload(false)}
          />
        )}
      </div>

      {/* Generate modal */}
      {showGenerate && business?.id && (
        <GenerateContractModal
          businessId={business.id}
          onClose={() => setShowGenerate(false)}
        />
      )}
    </div>
  );
}

function ContractCard({ contract: c }: { contract: Contract }) {
  const expDays = daysUntil(c.expirationDate);
  const renewDays = daysUntil(c.autoRenewalDate);
  const urgentDays = renewDays ?? expDays;

  return (
    <Link
      href={`/contracts/${c.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-slate-900 truncate">{c.counterpartyName}</p>
            {c.healthScore !== undefined && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                c.healthScore >= 80 ? "bg-green-100 text-green-700" :
                c.healthScore >= 60 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              }`}>
                {c.healthScore}/100
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 capitalize">
            {c.contractType.replace(/_/g, " ")}
            {c.monthlyValue ? ` · $${c.monthlyValue.toLocaleString()}/mo` : ""}
          </p>
          {urgentDays !== null && urgentDays <= 30 && (
            <p className={`text-xs mt-1 font-medium ${urgentDays <= 7 ? "text-red-600" : "text-yellow-600"}`}>
              {renewDays !== null ? "Auto-renews" : "Expires"} in {urgentDays} day{urgentDays !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          {c.analysis?.riskLevel && (
            <Badge variant={riskVariant[c.analysis.riskLevel]}>
              {c.analysis.riskLevel} risk
            </Badge>
          )}
          <Badge variant={statusVariant[c.status]}>
            {c.status.replace(/_/g, " ")}
          </Badge>
        </div>
      </div>
      {c.analysis?.clauses?.filter((cl) => cl.riskLevel === "danger").length > 0 && (
        <p className="text-xs text-red-600 mt-2">
          ⚠ {c.analysis.clauses.filter((cl) => cl.riskLevel === "danger").length} dangerous clause{c.analysis.clauses.filter((cl) => cl.riskLevel === "danger").length !== 1 ? "s" : ""} found
        </p>
      )}
    </Link>
  );
}
