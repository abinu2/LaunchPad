import type { Quote } from "@/types/quote";

interface Props {
  quotes: Quote[];
}

interface Stage {
  key: Quote["status"] | "pipeline";
  label: string;
  color: string;
  bg: string;
}

const STAGES: Stage[] = [
  { key: "draft",    label: "Draft",    color: "#94a3b8", bg: "bg-slate-400" },
  { key: "sent",     label: "Sent",     color: "#60a5fa", bg: "bg-blue-400" },
  { key: "viewed",   label: "Viewed",   color: "#818cf8", bg: "bg-indigo-400" },
  { key: "accepted", label: "Accepted", color: "#34d399", bg: "bg-emerald-400" },
  { key: "paid",     label: "Paid",     color: "#22c55e", bg: "bg-green-500" },
];

export function RevenuePipeline({ quotes }: Props) {
  const activeQuotes = quotes.filter((q) => q.status !== "expired" && q.status !== "declined");

  const stageData = STAGES.map((s) => {
    const qs = activeQuotes.filter((q) => {
      if (s.key === "accepted") return q.status === "accepted" || q.status === "invoiced";
      return q.status === s.key;
    });
    const value = qs.reduce((sum, q) => sum + q.total, 0);
    return { ...s, count: qs.length, value };
  });

  const maxCount = Math.max(...stageData.map((s) => s.count), 1);
  const totalPipelineValue = stageData.reduce((sum, s) => sum + s.value, 0);
  const paidValue = stageData.find((s) => s.key === "paid")?.value ?? 0;
  const conversionRate =
    stageData[1].count > 0 // sent
      ? Math.round(((stageData[3].count + stageData[4].count) / stageData[1].count) * 100)
      : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Revenue Pipeline</p>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-500">
            Close rate: <span className="font-semibold text-slate-800">{conversionRate}%</span>
          </span>
        </div>
      </div>

      {/* Funnel bars */}
      <div className="space-y-2 mb-4">
        {stageData.map((s) => (
          <div key={s.key} className="flex items-center gap-2.5">
            <span className="text-xs text-slate-500 w-14 flex-shrink-0">{s.label}</span>
            <div className="flex-1 h-5 bg-slate-50 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-700"
                style={{
                  width: `${(s.count / maxCount) * 100}%`,
                  backgroundColor: s.color,
                  minWidth: s.count > 0 ? "4px" : "0",
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 w-24 justify-end">
              <span className="text-xs font-semibold text-slate-800">{s.count}</span>
              {s.value > 0 && (
                <span className="text-xs text-slate-400">${s.value.toLocaleString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-400">Total pipeline</p>
          <p className="text-sm font-semibold text-slate-900">${totalPipelineValue.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Collected</p>
          <p className="text-sm font-semibold text-green-700">${paidValue.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
