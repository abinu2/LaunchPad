import type { Contract } from "@/types/contract";

interface Props {
  contracts: Contract[];
}

export function ProtectionQuadrant({ contracts }: Props) {
  const active = contracts.filter((c) => c.status === "active");
  const expiringSoon = contracts.filter((c) => c.status === "expiring_soon");
  const totalMonthlyValue = active.reduce((sum, c) => sum + (c.monthlyValue ?? 0), 0);

  const shieldColor =
    expiringSoon.length > 0 ? "text-yellow-500" : active.length > 0 ? "text-green-500" : "text-slate-300";

  const statusText =
    active.length === 0
      ? "No contracts yet — upload your first"
      : expiringSoon.length > 0
      ? `${expiringSoon.length} contract${expiringSoon.length > 1 ? "s" : ""} expiring soon`
      : "All contracts current";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full group-hover:border-blue-300 group-hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Am I Protected?</p>
          <p className="text-2xl font-bold text-slate-900">{active.length}</p>
          <p className="text-sm text-slate-500">active contract{active.length !== 1 ? "s" : ""}</p>
        </div>
        <svg className={`w-10 h-10 ${shieldColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
      </div>

      <p className="text-sm text-slate-600 mb-3">{statusText}</p>

      {expiringSoon.length > 0 && (
        <div className="space-y-1 mb-3">
          {expiringSoon.slice(0, 2).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
              <span className="text-slate-600 truncate">{c.counterpartyName}</span>
              <span className="text-yellow-600 ml-auto flex-shrink-0">Expiring soon</span>
            </div>
          ))}
        </div>
      )}

      {totalMonthlyValue > 0 && (
        <div className="pt-3 border-t border-slate-100">
          <p className="text-xs text-slate-400">
            Total contract value: <span className="font-medium text-slate-700">${totalMonthlyValue.toLocaleString()}/mo</span>
          </p>
        </div>
      )}
    </div>
  );
}
