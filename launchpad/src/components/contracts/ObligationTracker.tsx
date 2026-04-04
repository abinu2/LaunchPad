"use client";

import { useState } from "react";
import type { ContractObligation } from "@/types/contract";

interface Props {
  obligations: ContractObligation[];
  onUpdate: (obligations: ContractObligation[]) => Promise<void>;
}

const statusConfig: Record<ContractObligation["status"], { label: string; color: string; dot: string }> = {
  pending: { label: "Pending", color: "bg-blue-100 text-blue-700", dot: "bg-blue-400" },
  fulfilled: { label: "Fulfilled", color: "bg-green-100 text-green-700", dot: "bg-green-400" },
  at_risk: { label: "At risk", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-400" },
  breached: { label: "Breached", color: "bg-red-100 text-red-700", dot: "bg-red-400" },
  not_applicable: { label: "N/A", color: "bg-slate-100 text-slate-500", dot: "bg-slate-300" },
};

const triggerIcon: Record<ContractObligation["triggerType"], string> = {
  date: "📅",
  event: "⚡",
  threshold: "📊",
  recurring: "🔄",
};

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

export function ObligationTracker({ obligations, onUpdate }: Props) {
  const [saving, setSaving] = useState<string | null>(null);

  const updateStatus = async (id: string, status: ContractObligation["status"]) => {
    setSaving(id);
    const updated = obligations.map((o) => (o.id === id ? { ...o, status } : o));
    await onUpdate(updated);
    setSaving(null);
  };

  const updateNotes = async (id: string, notes: string) => {
    const updated = obligations.map((o) => (o.id === id ? { ...o, notes } : o));
    await onUpdate(updated);
  };

  if (obligations.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-10 text-center">
        <p className="text-slate-500">No obligations extracted from this contract.</p>
      </div>
    );
  }

  // Group by party
  const byParty = {
    business: obligations.filter((o) => o.party === "business"),
    counterparty: obligations.filter((o) => o.party === "counterparty"),
  };

  const sections: { key: "business" | "counterparty"; label: string }[] = [
    { key: "business", label: "Your obligations" },
    { key: "counterparty", label: "Their obligations" },
  ];

  return (
    <div className="space-y-6">
      {sections.map(({ key, label }) => {
        const items = byParty[key];
        if (items.length === 0) return null;

        return (
          <div key={key}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{label}</p>
            <div className="space-y-3">
              {items.map((obl) => {
                const cfg = statusConfig[obl.status];
                const days = daysUntil(obl.dueDate);
                const isUrgent = days !== null && days >= 0 && days <= 14;
                const isOverdue = days !== null && days < 0;

                return (
                  <div
                    key={obl.id}
                    className={`bg-white rounded-xl border p-4 ${
                      isOverdue ? "border-red-200" : isUrgent ? "border-yellow-200" : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <span className="text-base flex-shrink-0 mt-0.5">{triggerIcon[obl.triggerType]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">{obl.description}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {obl.clauseRef && <span className="mr-2">Clause {obl.clauseRef}</span>}
                            {obl.triggerDescription}
                          </p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Due date */}
                    {obl.dueDate && (
                      <p className={`text-xs font-medium mb-2 ${
                        isOverdue ? "text-red-600" : isUrgent ? "text-yellow-600" : "text-slate-500"
                      }`}>
                        {isOverdue
                          ? `Overdue by ${Math.abs(days!)} day${Math.abs(days!) !== 1 ? "s" : ""}`
                          : days === 0
                          ? "Due today"
                          : `Due in ${days} day${days !== 1 ? "s" : ""} · ${new Date(obl.dueDate).toLocaleDateString()}`}
                      </p>
                    )}

                    {obl.recurringFrequency && (
                      <p className="text-xs text-slate-400 mb-2">Recurring: {obl.recurringFrequency}</p>
                    )}

                    {/* Status actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(["pending", "fulfilled", "at_risk", "breached", "not_applicable"] as ContractObligation["status"][]).map((s) => (
                        <button
                          key={s}
                          disabled={saving === obl.id || obl.status === s}
                          onClick={() => updateStatus(obl.id, s)}
                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                            obl.status === s
                              ? `${statusConfig[s].color} border-transparent font-medium`
                              : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          } disabled:opacity-50`}
                        >
                          {saving === obl.id && obl.status !== s ? "..." : statusConfig[s].label}
                        </button>
                      ))}
                    </div>

                    {/* Notes */}
                    <details className="mt-2 group">
                      <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                        {obl.notes ? "Notes (click to edit)" : "Add notes"}
                      </summary>
                      <textarea
                        defaultValue={obl.notes ?? ""}
                        onBlur={(e) => updateNotes(obl.id, e.target.value)}
                        placeholder="Add context or notes about this obligation..."
                        className="mt-2 w-full text-xs text-slate-600 border border-slate-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                        rows={2}
                      />
                    </details>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
