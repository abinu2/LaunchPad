import type { ComplianceItem } from "@/types/compliance";

interface Props {
  items: ComplianceItem[];
}

export function ComplianceQuadrant({ items }: Props) {
  const compliant = items.filter((i) => i.status === "compliant").length;
  const dueSoon = items.filter((i) => i.status === "due_soon").length;
  const overdue = items.filter((i) => i.status === "overdue").length;
  const total = items.length;
  const pct = total > 0 ? Math.round((compliant / total) * 100) : 0;

  const urgentItems = items
    .filter((i) => i.status === "overdue" || (i.status === "due_soon" && (i.daysUntilDue ?? 999) <= 14))
    .slice(0, 3);

  const ringColor = overdue > 0 ? "#ef4444" : dueSoon > 0 ? "#f59e0b" : "#22c55e";
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 h-full group-hover:border-blue-300 group-hover:shadow-sm transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Am I Compliant?</p>
          <p className="text-2xl font-bold text-slate-900">{compliant}<span className="text-base font-normal text-slate-400">/{total}</span></p>
          <p className="text-sm text-slate-500">requirements met</p>
        </div>
        {/* Ring chart */}
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle cx="24" cy="24" r="20" fill="none" stroke="#e2e8f0" strokeWidth="5" />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke={ringColor}
            strokeWidth="5"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
          />
          <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="600" fill="#1e293b">{pct}%</text>
        </svg>
      </div>

      <div className="flex gap-3 mb-3 text-xs">
        {overdue > 0 && <span className="text-red-600 font-medium">{overdue} overdue</span>}
        {dueSoon > 0 && <span className="text-yellow-600 font-medium">{dueSoon} due soon</span>}
        {overdue === 0 && dueSoon === 0 && total > 0 && <span className="text-green-600 font-medium">All current</span>}
      </div>

      {urgentItems.length > 0 && (
        <div className="space-y-1.5">
          {urgentItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === "overdue" ? "bg-red-400" : "bg-yellow-400"}`} />
              <span className="text-slate-600 truncate flex-1">{item.title}</span>
              <span className={`flex-shrink-0 ${item.status === "overdue" ? "text-red-600" : "text-yellow-600"}`}>
                {item.status === "overdue" ? "Overdue" : `${item.daysUntilDue}d`}
              </span>
            </div>
          ))}
        </div>
      )}

      {total === 0 && (
        <p className="text-sm text-slate-400">Compliance items will appear after onboarding</p>
      )}
    </div>
  );
}
