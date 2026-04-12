import type { Contract } from "@/types/contract";

interface Props {
  contracts: Contract[];
}

export function ProtectionQuadrant({ contracts }: Props) {
  const active = contracts.filter((c) => c.status === "active");
  const expiringSoon = contracts.filter((c) => c.status === "expiring_soon");
  const totalMonthlyValue = active.reduce((sum, c) => sum + (c.monthlyValue ?? 0), 0);

  const shieldColor =
    expiringSoon.length > 0 ? "text-amber-400" : active.length > 0 ? "text-[#00CF31]" : "text-white/20";

  const statusText =
    active.length === 0
      ? "No contracts yet — upload your first"
      : expiringSoon.length > 0
      ? `${expiringSoon.length} contract${expiringSoon.length > 1 ? "s" : ""} expiring soon`
      : "All contracts current";

  return (
    <div className="glass-card rounded-xl p-5 h-full group-hover:border-[#00CF31]/30 group-hover:shadow-lg transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-1">Am I Protected?</p>
          <p className="text-2xl font-bold text-white">{active.length}</p>
          <p className="text-sm text-white/50">active contract{active.length !== 1 ? "s" : ""}</p>
        </div>
        <svg className={`w-10 h-10 ${shieldColor}`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
      </div>

      <p className="text-sm text-white/60 mb-3">{statusText}</p>

      {expiringSoon.length > 0 && (
        <div className="space-y-1 mb-3">
          {expiringSoon.slice(0, 2).map((c) => (
            <div key={c.id} className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="text-white/60 truncate">{c.counterpartyName}</span>
              <span className="text-amber-400 ml-auto flex-shrink-0">Expiring soon</span>
            </div>
          ))}
        </div>
      )}

      {totalMonthlyValue > 0 && (
        <div className="pt-3 border-t border-white/8">
          <p className="text-xs text-white/40">
            Total contract value: <span className="font-medium text-white/70">${totalMonthlyValue.toLocaleString()}/mo</span>
          </p>
        </div>
      )}
    </div>
  );
}
