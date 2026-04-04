"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useBusiness } from "@/context/BusinessContext";
import { getContract, updateContract, updateContractObligations, deleteContract } from "@/services/business-graph";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ClauseAccordion } from "@/components/contracts/ClauseAccordion";
import { ObligationTracker } from "@/components/contracts/ObligationTracker";
import { CounterProposalModal } from "@/components/contracts/CounterProposalModal";
import { SiteNav } from "@/components/ui/SiteNav";
import type { Contract, ContractObligation } from "@/types/contract";

// ─── helpers ─────────────────────────────────────────────────────────────────

const riskVariant: Record<string, "success" | "warning" | "danger"> = {
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

function TimelineBar({ contract: c }: { contract: Contract }) {
  const start = c.effectiveDate ? new Date(c.effectiveDate) : null;
  const end = c.expirationDate ? new Date(c.expirationDate) : null;
  const renewal = c.autoRenewalDate ? new Date(c.autoRenewalDate) : null;
  const now = new Date();

  if (!start && !end) return null;

  const rangeStart = start ?? now;
  const rangeEnd = end ?? new Date(now.getTime() + 365 * 86400000);
  const total = rangeEnd.getTime() - rangeStart.getTime();
  const elapsed = Math.max(0, Math.min(now.getTime() - rangeStart.getTime(), total));
  const pct = total > 0 ? Math.round((elapsed / total) * 100) : 0;

  const renewalPct = renewal && total > 0
    ? Math.round(((renewal.getTime() - rangeStart.getTime()) / total) * 100)
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Contract timeline</p>
      <div className="relative h-3 bg-slate-100 rounded-full overflow-visible mb-3">
        <div className="absolute left-0 top-0 h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
        {renewalPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-yellow-400 border-2 border-white rounded-full z-10"
            style={{ left: `${renewalPct}%` }}
            title={`Auto-renewal: ${c.autoRenewalDate}`}
          />
        )}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 border-2 border-white rounded-full z-10"
          style={{ left: `${pct}%` }}
          title="Today"
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{start?.toLocaleDateString() ?? "—"}</span>
        {renewal && <span className="text-yellow-600">⚡ Renewal {renewal.toLocaleDateString()}</span>}
        <span>{end?.toLocaleDateString() ?? "Ongoing"}</span>
      </div>
      {c.autoRenewalNoticePeriod && renewal && (
        <p className="text-xs text-amber-600 mt-2">
          ⚠ Send cancellation notice by {new Date(renewal.getTime() - c.autoRenewalNoticePeriod * 86400000).toLocaleDateString()} to avoid auto-renewal
        </p>
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

type Tab = "analysis" | "obligations" | "document";

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { business } = useBusiness();
  const router = useRouter();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("analysis");
  const [showCounterProposal, setShowCounterProposal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!business?.id || !id) return;
    let cancelled = false;

    void getContract(business.id, id).then((result) => {
      if (cancelled) return;
      setContract(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [business, id]);

  const handleObligationUpdate = async (obligations: ContractObligation[]) => {
    if (!business?.id || !id) return;
    await updateContractObligations(business.id, id, obligations);
    setContract((prev) => prev ? { ...prev, obligations } : prev);
  };

  const handleStatusChange = async (status: Contract["status"]) => {
    if (!business?.id || !id) return;
    await updateContract(business.id, id, { status });
    setContract((prev) => prev ? { ...prev, status } : prev);
  };

  const handleDelete = async () => {
    if (!business?.id || !id || !confirm("Delete this contract? This cannot be undone.")) return;
    setDeleting(true);
    await deleteContract(business.id, id);
    router.push("/contracts");
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );

  if (!contract) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-600 mb-3">Contract not found.</p>
        <Link href="/contracts" className="text-blue-600 text-sm hover:underline">← Back to vault</Link>
      </div>
    </div>
  );

  const dangerClauses = contract.analysis?.clauses?.filter((c) => c.riskLevel === "danger") ?? [];
  const cautionClauses = contract.analysis?.clauses?.filter((c) => c.riskLevel === "caution") ?? [];
  const safeClauses = contract.analysis?.clauses?.filter((c) => c.riskLevel === "safe") ?? [];
  const pendingObligations = contract.obligations?.filter((o) => o.status === "pending" || o.status === "at_risk") ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteNav />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Breadcrumb */}
        <Link href="/contracts" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Contract Vault
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 truncate">{contract.counterpartyName}</h1>
              <p className="text-slate-500 text-sm capitalize mt-0.5">
                {contract.contractType.replace(/_/g, " ")}
                {contract.monthlyValue ? ` · $${contract.monthlyValue.toLocaleString()}/mo` : ""}
                {contract.totalValue ? ` · $${contract.totalValue.toLocaleString()} total` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {contract.analysis?.riskLevel && (
                <Badge variant={riskVariant[contract.analysis.riskLevel]}>
                  {contract.analysis.riskLevel} risk
                </Badge>
              )}
              <Badge variant={statusVariant[contract.status]}>
                {contract.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>

          {/* Health score */}
          {contract.healthScore !== undefined && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Contract health</span>
                <span className="font-semibold text-slate-700">{contract.healthScore}/100</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    contract.healthScore >= 80 ? "bg-green-500" :
                    contract.healthScore >= 60 ? "bg-yellow-400" : "bg-red-500"
                  }`}
                  style={{ width: `${contract.healthScore}%` }}
                />
              </div>
            </div>
          )}

          {/* Summary */}
          {contract.analysis?.summary && (
            <p className="text-sm text-slate-700 leading-relaxed mb-4">{contract.analysis.summary}</p>
          )}

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <StatChip label="Dangerous clauses" value={dangerClauses.length} color={dangerClauses.length > 0 ? "red" : "green"} />
            <StatChip label="Caution clauses" value={cautionClauses.length} color={cautionClauses.length > 0 ? "yellow" : "green"} />
            <StatChip label="Missing protections" value={contract.analysis?.missingProtections?.length ?? 0} color={(contract.analysis?.missingProtections?.length ?? 0) > 0 ? "yellow" : "green"} />
            <StatChip label="Open obligations" value={pendingObligations.length} color={pendingObligations.length > 0 ? "blue" : "green"} />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {contract.analysis?.counterProposalDraft && (
              <Button size="sm" onClick={() => setShowCounterProposal(true)}>
                View counter-proposal
              </Button>
            )}
            {contract.fileUrl && (
              <a
                href={contract.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 text-sm text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View original
              </a>
            )}
            <select
              value={contract.status}
              onChange={(e) => handleStatusChange(e.target.value as Contract["status"])}
              className="h-8 px-2 text-sm text-slate-700 border border-slate-300 rounded-lg bg-white"
            >
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring soon</option>
              <option value="expired">Expired</option>
              <option value="under_review">Under review</option>
              <option value="draft">Draft</option>
            </select>
            <Button size="sm" variant="danger" loading={deleting} onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>

        {/* Timeline */}
        <TimelineBar contract={contract} />

        {/* Conflicts alert */}
        {(contract.analysis?.conflicts?.length ?? 0) > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-red-800 mb-2">
              ⚡ {contract.analysis.conflicts.length} conflict{contract.analysis.conflicts.length !== 1 ? "s" : ""} with other contracts
            </p>
            {contract.analysis.conflicts.map((conflict, i) => (
              <div key={i} className="mb-3 last:mb-0">
                <p className="text-sm text-red-700 font-medium">{conflict.description}</p>
                <p className="text-xs text-red-600 mt-0.5">{conflict.recommendation}</p>
                <Link href={`/contracts/${conflict.conflictingContractId}`} className="text-xs text-red-500 hover:underline mt-0.5 block">
                  See {conflict.conflictingContractName} →
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
          {(["analysis", "obligations", "document"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors ${
                tab === t ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t}
              {t === "obligations" && pendingObligations.length > 0 && (
                <span className="ml-1.5 bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5">
                  {pendingObligations.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── ANALYSIS TAB ── */}
        {tab === "analysis" && (
          <div className="space-y-4">
            {/* Dangerous clauses first */}
            {dangerClauses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">
                  ⚠ Dangerous clauses ({dangerClauses.length})
                </p>
                <ClauseAccordion clauses={dangerClauses} defaultOpen />
              </div>
            )}

            {/* Caution clauses */}
            {cautionClauses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-yellow-600 uppercase tracking-wide mb-2">
                  Caution clauses ({cautionClauses.length})
                </p>
                <ClauseAccordion clauses={cautionClauses} />
              </div>
            )}

            {/* Missing protections */}
            {(contract.analysis?.missingProtections?.length ?? 0) > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2">Missing protections</p>
                <ul className="space-y-1">
                  {contract.analysis.missingProtections.map((p, i) => (
                    <li key={i} className="text-sm text-amber-700 flex gap-2">
                      <span className="flex-shrink-0">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {(contract.analysis?.recommendations?.length ?? 0) > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-blue-800 mb-2">Recommendations</p>
                <ul className="space-y-1">
                  {contract.analysis.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-blue-700 flex gap-2">
                      <span className="flex-shrink-0">→</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safe clauses collapsed */}
            {safeClauses.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">
                  Safe clauses ({safeClauses.length})
                </p>
                <ClauseAccordion clauses={safeClauses} />
              </div>
            )}

            {/* Playbook deviations */}
            {(contract.analysis?.playbookDeviations?.length ?? 0) > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-800 mb-3">Playbook deviations</p>
                <div className="space-y-3">
                  {contract.analysis.playbookDeviations.map((d, i) => (
                    <div key={i} className="border-l-2 border-slate-300 pl-3">
                      <p className="text-sm font-medium text-slate-700">{d.clauseTitle}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{d.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── OBLIGATIONS TAB ── */}
        {tab === "obligations" && (
          <ObligationTracker
            obligations={contract.obligations ?? []}
            onUpdate={handleObligationUpdate}
          />
        )}

        {/* ── DOCUMENT TAB ── */}
        {tab === "document" && (
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            {(contract.analysis as { generatedHtml?: string })?.generatedHtml ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-slate-900">Generated contract</p>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">AI-generated draft</span>
                </div>
                <div
                  className="prose prose-sm max-w-none border border-slate-200 rounded-lg p-6 overflow-y-auto max-h-[600px]"
                  dangerouslySetInnerHTML={{ __html: (contract.analysis as { generatedHtml: string }).generatedHtml }}
                />
              </>
            ) : contract.fileUrl ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="font-semibold text-slate-900">Original document</p>
                  <a
                    href={contract.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Open in new tab →
                  </a>
                </div>
                {contract.fileType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contract.fileUrl} alt={contract.fileName} className="w-full rounded-lg border border-slate-200" />
                ) : (
                  <iframe
                    src={contract.fileUrl}
                    className="w-full h-[600px] rounded-lg border border-slate-200"
                    title={contract.fileName}
                  />
                )}
              </>
            ) : (
              <p className="text-slate-400 text-sm text-center py-8">No document available</p>
            )}
          </div>
        )}
      </div>

      {/* Counter-proposal modal */}
      {showCounterProposal && contract.analysis?.counterProposalDraft && (
        <CounterProposalModal
          draft={contract.analysis.counterProposalDraft}
          counterpartyName={contract.counterpartyName}
          onClose={() => setShowCounterProposal(false)}
        />
      )}
    </div>
  );
}

function StatChip({ label, value, color }: { label: string; value: number; color: "red" | "yellow" | "green" | "blue" }) {
  const colors = {
    red: "bg-red-50 text-red-700",
    yellow: "bg-yellow-50 text-yellow-700",
    green: "bg-green-50 text-green-700",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <div className={`rounded-lg p-3 ${colors[color]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}
