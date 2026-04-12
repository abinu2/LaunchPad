import type { DashboardData } from "@/app/dashboard/page";
import type { BusinessProfile } from "@/types/business";

interface Props {
  data: DashboardData;
  business: BusinessProfile;
}

interface Dimension {
  label: string;
  score: number;
  color: string;
  icon: React.ReactNode;
}

function calcProtectionScore(data: DashboardData): number {
  const { contracts } = data;
  if (contracts.length === 0) return 20;
  const active = contracts.filter((c) => c.status === "active");
  const expiring = contracts.filter((c) => c.status === "expiring_soon");
  const expired = contracts.filter((c) => c.status === "expired");
  const avgHealth =
    active.length > 0
      ? Math.round(active.reduce((s, c) => s + (c.healthScore ?? 70), 0) / active.length)
      : 50;
  let score = avgHealth;
  score -= expiring.length * 8;
  score -= expired.length * 15;
  return Math.min(100, Math.max(0, score));
}

function calcComplianceScore(data: DashboardData): number {
  const items = data.complianceItems;
  if (items.length === 0) return 70;
  const compliant = items.filter((i) => i.status === "compliant").length;
  const overdue = items.filter((i) => i.status === "overdue").length;
  const dueSoon = items.filter((i) => i.status === "due_soon").length;
  let score = Math.round((compliant / items.length) * 100);
  score -= overdue * 15;
  score -= dueSoon * 5;
  return Math.min(100, Math.max(0, score));
}

function calcFinancesScore(data: DashboardData, business: BusinessProfile): number {
  const { quotes, receipts } = data;
  const revenue = quotes
    .filter((q) => q.status === "paid")
    .reduce((s, q) => s + q.total, 0);
  const expenses = receipts.reduce((s, r) => s + (r.amount ?? 0), 0);
  const cashBalance = business.financials?.currentCashBalance;

  if (revenue === 0 && cashBalance == null) return 40;

  let score = 50;
  const margin = revenue > 0 ? (revenue - expenses) / revenue : 0;
  if (margin > 0.5) score += 30;
  else if (margin > 0.25) score += 20;
  else if (margin > 0) score += 10;
  else if (margin < 0) score -= 20;

  if (cashBalance != null && cashBalance > 0) score += 20;
  const unpaidAccepted = quotes.filter((q) => q.status === "accepted" && !q.paidAt);
  if (unpaidAccepted.length > 3) score -= 10;

  return Math.min(100, Math.max(0, score));
}

function calcGrowthScore(data: DashboardData): number {
  const { quotes, opportunities, growthActions } = data;
  const sent = quotes.filter((q) => ["sent", "viewed", "accepted", "declined", "paid"].includes(q.status));
  const accepted = quotes.filter((q) => ["accepted", "paid"].includes(q.status));
  const rate = sent.length > 0 ? accepted.length / sent.length : 0;

  let score = 50;
  if (rate >= 0.7) score += 20;
  else if (rate >= 0.4) score += 10;
  if (opportunities.length > 0) score += 10;
  if (growthActions.length > 0) score += 10;
  if (quotes.length === 0) score -= 20;

  return Math.min(100, Math.max(0, score));
}

function scoreColor(score: number) {
  if (score >= 75) return { ring: "#00CF31", bg: "bg-green-500/15", text: "text-green-400", label: "Strong" };
  if (score >= 50) return { ring: "#f59e0b", bg: "bg-amber-500/15", text: "text-amber-400", label: "Fair" };
  return { ring: "#ef4444", bg: "bg-red-500/15", text: "text-red-400", label: "Needs attention" };
}

export function BusinessHealthScore({ data, business }: Props) {
  const protection = calcProtectionScore(data);
  const compliance = calcComplianceScore(data);
  const finances = calcFinancesScore(data, business);
  const growth = calcGrowthScore(data);
  const overall = Math.round(protection * 0.25 + compliance * 0.35 + finances * 0.25 + growth * 0.15);

  const { ring, bg, text, label } = scoreColor(overall);

  const r = 38;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference - (overall / 100) * circumference;

  const dimensions: Dimension[] = [
    {
      label: "Protected",
      score: protection,
      color: scoreColor(protection).text,
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
        </svg>
      ),
    },
    {
      label: "Compliant",
      score: compliance,
      color: scoreColor(compliance).text,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Financial",
      score: finances,
      color: scoreColor(finances).text,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Growth",
      score: growth,
      color: scoreColor(growth).text,
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="glass-card rounded-xl p-5">
      <p className="text-xs font-medium text-white/40 uppercase tracking-wide mb-4">Business Health Score</p>

      <div className="flex items-center gap-6">
        {/* Ring gauge */}
        <div className="relative flex-shrink-0">
          <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle
              cx="48" cy="48" r={r}
              fill="none"
              stroke={ring}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
            />
            <text x="48" y="44" textAnchor="middle" fontSize="20" fontWeight="700" fill="white">{overall}</text>
            <text x="48" y="58" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.5)">/100</text>
          </svg>
          <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${bg} ${text}`}>
            {label}
          </div>
        </div>

        {/* Dimension breakdown */}
        <div className="flex-1 space-y-2.5">
          {dimensions.map((d) => (
            <div key={d.label} className="flex items-center gap-2">
              <span className={`flex-shrink-0 ${d.color}`}>{d.icon}</span>
              <span className="text-xs text-white/50 w-16 flex-shrink-0">{d.label}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${d.score}%`,
                    backgroundColor: scoreColor(d.score).ring,
                    transition: "width 0.8s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
              </div>
              <span className="text-xs font-medium text-white/70 w-7 text-right flex-shrink-0">{d.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
