"use client";

import { useEffect, useState, useCallback } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { getComplianceItems, updateComplianceItem } from "@/services/business-graph";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/Button";
import type { ComplianceItem } from "@/types/compliance";

// Disable static prerendering for this page
export const dynamic = "force-dynamic";

// ─── helpers ─────────────────────────────────────────────────────────────────

const statusConfig = {
  compliant:      { label: "Compliant",   color: "bg-green-500/15 text-green-400 border border-green-500/20",   dot: "bg-green-400"  },
  due_soon:       { label: "Due soon",    color: "bg-amber-500/15 text-amber-400 border border-amber-500/20",   dot: "bg-amber-400"  },
  overdue:        { label: "Overdue",     color: "bg-red-500/15 text-red-400 border border-red-500/20",         dot: "bg-red-400"    },
  not_started:    { label: "Not started", color: "bg-white/8 text-white/50 border border-white/10",             dot: "bg-white/20"   },
  not_applicable: { label: "N/A",         color: "bg-white/5 text-white/30 border border-white/8",              dot: "bg-white/15"   },
};

const categoryIcon: Record<ComplianceItem["category"], string> = {
  license: "🪪", registration: "📋", permit: "📄",
  tax_filing: "💰", insurance: "🛡️", report: "📊",
};

const jurisdictionOrder = ["federal", "state", "county", "city"] as const;

// ─── Detail modal ─────────────────────────────────────────────────────────────

function ComplianceDetailModal({
  item,
  onClose,
  onMarkComplete,
}: {
  item: ComplianceItem;
  onClose: () => void;
  onMarkComplete: (item: ComplianceItem) => Promise<void>;
}) {
  const [marking, setMarking] = useState(false);
  const cfg = statusConfig[item.status];

  const handleMark = async () => {
    setMarking(true);
    await onMarkComplete(item);
    setMarking(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="sidebar-panel rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-white/10">
        <div className="flex items-start justify-between px-6 py-4 border-b border-white/8">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{categoryIcon[item.category]}</span>
            <div>
              <h2 className="font-bold text-white">{item.title}</h2>
              <p className="text-sm text-white/50">{item.jurisdictionName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white/70 p-1 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
            {item.isRequired && <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">Required</span>}
            <span className="text-xs bg-white/8 text-white/50 border border-white/10 px-2 py-0.5 rounded-full capitalize">{item.category.replace("_", " ")}</span>
          </div>

          <p className="text-sm text-white/70 leading-relaxed">{item.description}</p>

          {item.legalCitation && (
            <div className="bg-white/5 rounded-lg p-3 border border-white/8">
              <p className="text-xs font-semibold text-white/40 mb-1">Legal citation</p>
              <p className="text-sm text-white/70 font-mono">{item.legalCitation}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {item.cost !== null && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/8">
                <p className="text-xs text-white/40 mb-0.5">Filing cost</p>
                <p className="text-sm font-semibold text-white">${item.cost}</p>
              </div>
            )}
            {item.renewalFrequency && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/8">
                <p className="text-xs text-white/40 mb-0.5">Renewal</p>
                <p className="text-sm font-semibold text-white capitalize">{item.renewalFrequency.replace("_", " ")}</p>
              </div>
            )}
            {item.estimatedProcessingTime && (
              <div className="bg-white/5 rounded-lg p-3 border border-white/8">
                <p className="text-xs text-white/40 mb-0.5">Processing time</p>
                <p className="text-sm font-semibold text-white">{item.estimatedProcessingTime}</p>
              </div>
            )}
            {item.daysUntilDue !== null && (
              <div className={`rounded-lg p-3 border ${item.daysUntilDue <= 0 ? "bg-red-500/10 border-red-500/20" : item.daysUntilDue <= 14 ? "bg-amber-500/10 border-amber-500/20" : "bg-white/5 border-white/8"}`}>
                <p className="text-xs text-white/40 mb-0.5">Due</p>
                <p className={`text-sm font-semibold ${item.daysUntilDue <= 0 ? "text-red-400" : item.daysUntilDue <= 14 ? "text-amber-400" : "text-white"}`}>
                  {item.daysUntilDue <= 0 ? "Overdue" : `In ${item.daysUntilDue} days`}
                </p>
              </div>
            )}
          </div>

          {item.penaltyForNonCompliance && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-400 mb-1">Penalty for non-compliance</p>
              <p className="text-sm text-red-300">{item.penaltyForNonCompliance}</p>
            </div>
          )}

          {item.documentationRequired.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-white/40 mb-2">Documents required</p>
              <ul className="space-y-1">
                {item.documentationRequired.map((doc, i) => (
                  <li key={i} className="text-sm text-white/70 flex gap-2">
                    <span className="text-white/30">•</span>{doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-white/8">
          {item.applicationUrl ? (
            <a
              href={item.applicationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-black bg-[#00CF31] rounded-lg hover:bg-[#00b82c] transition-colors font-semibold"
            >
              File now →
            </a>
          ) : <div />}
          {item.status !== "compliant" && (
            <Button size="sm" variant="secondary" loading={marking} onClick={handleMark}>
              Mark as complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar view ────────────────────────────────────────────────────────────

function CalendarView({ items }: { items: ComplianceItem[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const byDay: Record<number, ComplianceItem[]> = {};
  items.forEach((item) => {
    if (!item.expirationDate && item.daysUntilDue === null) return;
    const dueDate = item.expirationDate
      ? new Date(item.expirationDate)
      : item.daysUntilDue !== null
      ? new Date(now.getTime() + item.daysUntilDue * 86400000)
      : null;
    if (!dueDate) return;
    if (dueDate.getFullYear() === year && dueDate.getMonth() === month) {
      const d = dueDate.getDate();
      if (!byDay[d]) byDay[d] = [];
      byDay[d].push(item);
    }
  });

  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
    i < firstDay ? null : i - firstDay + 1
  );

  return (
    <div className="glass-card rounded-xl p-5">
      <p className="font-semibold text-white mb-4">
        {now.toLocaleString("default", { month: "long", year: "numeric" })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
          <p key={d} className="text-xs text-white/40 font-medium">{d}</p>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayItems = byDay[day] ?? [];
          const isToday = day === now.getDate();
          const hasOverdue = dayItems.some((it) => it.status === "overdue");
          const hasDueSoon = dayItems.some((it) => it.status === "due_soon");
          const hasCompliant = dayItems.some((it) => it.status === "compliant");

          return (
            <div
              key={i}
              className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative ${
                isToday ? "bg-[#00CF31] text-black font-bold" :
                hasOverdue ? "bg-red-500/15" :
                hasDueSoon ? "bg-amber-500/15" :
                hasCompliant ? "bg-green-500/10" :
                "hover:bg-white/5"
              }`}
            >
              <span className={isToday ? "text-black" : "text-white/70"}>{day}</span>
              {dayItems.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayItems.slice(0, 3).map((it, j) => (
                    <span
                      key={j}
                      className={`w-1 h-1 rounded-full ${
                        it.status === "overdue" ? "bg-red-400" :
                        it.status === "due_soon" ? "bg-amber-400" :
                        it.status === "compliant" ? "bg-[#00CF31]" : "bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

type ViewMode = "list" | "calendar";

export default function CompliancePage() {
  const { business } = useBusiness();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ComplianceItem | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const load = useCallback(async () => {
    if (!business?.id) return;
    const data = await getComplianceItems(business.id);
    setItems(data);
    setLoading(false);
  }, [business?.id]);

  useEffect(() => { load(); }, [load]);

  const markComplete = async (item: ComplianceItem) => {
    if (!business?.id) return;
    await updateComplianceItem(business.id, item.id, {
      status: "compliant",
      obtainedDate: new Date().toISOString().slice(0, 10),
    });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "compliant" } : i));
  };

  const handleGenerate = async () => {
    if (!business?.id) return;
    setGenerating(true);
    try {
      await fetch("/api/ai/generate-compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      await load();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <AILoadingScreen title="Loading compliance" steps={["Fetching requirements", "Checking deadlines", "Reviewing permit status"]} variant="inline" />;

  const compliant = items.filter((i) => i.status === "compliant").length;
  const overdue   = items.filter((i) => i.status === "overdue").length;
  const dueSoon   = items.filter((i) => i.status === "due_soon").length;
  const pct = items.length > 0 ? Math.round((compliant / items.length) * 100) : 0;

  const urgentItems = items.filter(
    (i) => i.status === "overdue" || (i.status === "due_soon" && (i.daysUntilDue ?? 999) <= 14)
  );

  const grouped = jurisdictionOrder.reduce((acc, j) => {
    const jItems = items.filter((i) => i.jurisdiction === j && i.status !== "not_applicable");
    if (jItems.length > 0) acc[j] = jItems;
    return acc;
  }, {} as Record<string, ComplianceItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance</h1>
          <p className="text-white/50 text-sm mt-1">
            Am I Compliant? · {compliant}/{items.length} requirements met
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-white/8 p-1 rounded-lg border border-white/10">
            {(["list", "calendar"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                className={`px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  viewMode === v ? "bg-white/15 text-white shadow-sm" : "text-white/50 hover:text-white/70"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <Button size="sm" variant="secondary" loading={generating} onClick={handleGenerate}>
            {generating ? "Scanning..." : "Refresh with AI"}
          </Button>
        </div>
      </div>

      {/* Summary ring + stats */}
      <div className="grid grid-cols-4 gap-3">
        {/* Ring */}
        <div className="glass-card rounded-xl p-4 flex items-center justify-center">
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="7" />
            <circle
              cx="32" cy="32" r="26"
              fill="none"
              stroke={overdue > 0 ? "#ef4444" : dueSoon > 0 ? "#f59e0b" : "#00CF31"}
              strokeWidth="7"
              strokeDasharray={2 * Math.PI * 26}
              strokeDashoffset={2 * Math.PI * 26 * (1 - pct / 100)}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
            />
            <text x="32" y="36" textAnchor="middle" fontSize="14" fontWeight="700" fill="white">{pct}%</text>
          </svg>
        </div>
        <div className="glass-card rounded-xl p-4 text-center border-green-500/20">
          <p className="text-2xl font-bold text-[#00CF31]">{compliant}</p>
          <p className="text-xs text-green-400 mt-1">Compliant</p>
        </div>
        <div className={`glass-card rounded-xl p-4 text-center ${dueSoon > 0 ? "border-amber-500/20" : ""}`}>
          <p className={`text-2xl font-bold ${dueSoon > 0 ? "text-amber-400" : "text-white/30"}`}>{dueSoon}</p>
          <p className={`text-xs mt-1 ${dueSoon > 0 ? "text-amber-400" : "text-white/30"}`}>Due soon</p>
        </div>
        <div className={`glass-card rounded-xl p-4 text-center ${overdue > 0 ? "border-red-500/20" : ""}`}>
          <p className={`text-2xl font-bold ${overdue > 0 ? "text-red-400" : "text-white/30"}`}>{overdue}</p>
          <p className={`text-xs mt-1 ${overdue > 0 ? "text-red-400" : "text-white/30"}`}>Overdue</p>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === "calendar" && <CalendarView items={items} />}

      {/* Urgent alerts */}
      {urgentItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-white">Action required</h2>
          {urgentItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all ${
                item.status === "overdue"
                  ? "bg-red-500/10 border-red-500/20 hover:border-red-500/40"
                  : "bg-amber-500/10 border-amber-500/20 hover:border-amber-500/40"
              }`}
              onClick={() => setSelectedItem(item)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{categoryIcon[item.category]}</span>
                  <div className="min-w-0">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-white/60 mt-0.5 line-clamp-2">{item.description}</p>
                    {item.penaltyForNonCompliance && (
                      <p className="text-xs text-red-400 mt-1">Penalty: {item.penaltyForNonCompliance}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {item.applicationUrl && (
                    <a
                      href={item.applicationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs px-3 py-1.5 bg-[#00CF31] text-black font-semibold rounded-lg hover:bg-[#00b82c] text-center"
                    >
                      File now
                    </a>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); markComplete(item); }}
                    className="text-xs px-3 py-1.5 bg-white/8 border border-white/15 text-white/70 rounded-lg hover:bg-white/12"
                  >
                    Mark done
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full list by jurisdiction */}
      {viewMode === "list" && Object.entries(grouped).map(([jurisdiction, jItems]) => (
        <div key={jurisdiction}>
          <h2 className="font-semibold text-white/60 capitalize mb-3">{jurisdiction}</h2>
          <div className="space-y-2">
            {jItems.map((item) => {
              const cfg = statusConfig[item.status];
              return (
                <div
                  key={item.id}
                  className="glass-card rounded-xl p-4 cursor-pointer hover:border-[#00CF31]/30 hover:shadow-md transition-all"
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-white/50 mt-0.5">{item.jurisdictionName}</p>
                        {item.daysUntilDue !== null && item.status !== "compliant" && (
                          <p className="text-xs text-white/40 mt-0.5">
                            {item.daysUntilDue > 0 ? `Due in ${item.daysUntilDue} days` : "Overdue"}
                            {item.cost ? ` · $${item.cost}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {item.status !== "compliant" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markComplete(item); }}
                          className="text-xs text-white/30 hover:text-[#00CF31] transition-colors"
                          title="Mark complete"
                        >
                          ✓
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="glass-card rounded-xl border-dashed p-12 text-center">
          <p className="text-white/60 font-medium mb-2">No compliance requirements yet</p>
          <p className="text-white/40 text-sm mb-5">
            Click &quot;Refresh with AI&quot; to generate your complete compliance checklist based on your business type and location.
          </p>
          <Button onClick={handleGenerate} loading={generating}>
            Generate compliance checklist
          </Button>
        </div>
      )}

      {/* Detail modal */}
      {selectedItem && (
        <ComplianceDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onMarkComplete={markComplete}
        />
      )}
    </div>
  );
}
