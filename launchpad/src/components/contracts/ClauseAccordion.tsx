"use client";

import { useState } from "react";
import type { ClauseAnalysis } from "@/types/contract";

interface Props {
  clauses: ClauseAnalysis[];
  defaultOpen?: boolean;
}

const riskConfig = {
  safe: {
    border: "border-green-200",
    bg: "bg-green-50",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-400",
    icon: "✓",
  },
  caution: {
    border: "border-yellow-200",
    bg: "bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-400",
    icon: "⚠",
  },
  danger: {
    border: "border-red-200",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-400",
    icon: "✗",
  },
};

export function ClauseAccordion({ clauses, defaultOpen = false }: Props) {
  const [openIds, setOpenIds] = useState<Set<number>>(
    defaultOpen ? new Set(clauses.map((_, i) => i)) : new Set()
  );

  const toggle = (i: number) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {clauses.map((clause, i) => {
        const cfg = riskConfig[clause.riskLevel];
        const isOpen = openIds.has(i);

        return (
          <div key={i} className={`rounded-xl border ${cfg.border} overflow-hidden`}>
            <button
              onClick={() => toggle(i)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${cfg.bg} hover:brightness-95 transition-all`}
            >
              <span className={`w-5 h-5 rounded-full ${cfg.dot} flex items-center justify-center text-white text-xs flex-shrink-0`}>
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-900">
                  {clause.clauseNumber && <span className="text-slate-400 mr-1">{clause.clauseNumber}</span>}
                  {clause.clauseTitle}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.badge}`}>
                {clause.riskLevel}
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="px-4 py-4 bg-white border-t border-slate-100 space-y-3">
                {/* Plain English */}
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">What this means</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{clause.plainEnglish}</p>
                </div>

                {/* Original text */}
                {clause.originalText && (
                  <details className="group">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none">
                      Show original clause text
                    </summary>
                    <blockquote className="mt-2 pl-3 border-l-2 border-slate-200 text-xs text-slate-500 italic leading-relaxed">
                      {clause.originalText}
                    </blockquote>
                  </details>
                )}

                {/* Issue */}
                {clause.issue && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">Issue</p>
                    <p className="text-sm text-red-700">{clause.issue}</p>
                  </div>
                )}

                {/* Business impact */}
                {clause.businessImpact && (
                  <div className="bg-amber-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-700 mb-1">Business impact</p>
                    <p className="text-sm text-amber-700">{clause.businessImpact}</p>
                  </div>
                )}

                {/* Recommendation */}
                {clause.recommendation && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Recommendation</p>
                    <p className="text-sm text-blue-700">{clause.recommendation}</p>
                  </div>
                )}

                {/* Playbook clause */}
                {clause.playbookClause && (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Standard language</p>
                    <p className="text-xs text-slate-600 italic">{clause.playbookClause}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
