"use client";

import { useEffect, useState, useCallback } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { getReceipts, getQuotes } from "@/services/business-graph";
import { summarizeFinances } from "@/lib/finance";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import type { Receipt } from "@/types/financial";
import type { Quote } from "@/types/quote";
import type { TaxAIResult, MissedDeduction } from "@/app/api/ai/analyze-taxes/route";

// Disable static prerendering for this page
export const dynamic = "force-dynamic";

// ─── Quarterly tax dates ──────────────────────────────────────────────────────

function getQuarterlyDates(year: number) {
  return [
    { label: "Q4 (prior yr)", due: new Date(`${year}-01-15`), period: `Oct–Dec ${year - 1}` },
    { label: "Q1", due: new Date(`${year}-04-15`), period: `Jan–Mar ${year}` },
    { label: "Q2", due: new Date(`${year}-06-16`), period: `Apr–May ${year}` },
    { label: "Q3", due: new Date(`${year}-09-15`), period: `Jun–Aug ${year}` },
  ];
}

function daysUntil(date: Date): number {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

// ─── Static deduction eligibility ────────────────────────────────────────────

interface DeductionRule {
  id: string;
  title: string;
  description: string;
  eligible: boolean;
  reason: string;
  estimatedSavings: number;
  form: string;
  difficulty: "easy" | "moderate" | "complex";
}

function computeStaticDeductions(
  business: NonNullable<ReturnType<typeof useBusiness>["business"]>,
  ytdProfit: number,
  totalMiles: number,
  ytdExpenses: number
): DeductionRule[] {
  const isPassThrough = ["sole_prop", "llc", "partnership"].includes(business.entityType);
  const isLLC = business.entityType === "llc";
  const seRate = 0.153;
  const seAdjustment = 0.9235;
  const effectiveRate = 0.30;

  const seTax = isPassThrough ? ytdProfit * seAdjustment * seRate : 0;
  const halfSETax = seTax / 2;

  const qbiDeduction = isPassThrough ? Math.max(0, ytdProfit * 0.20) : 0;
  const qbiSavings = qbiDeduction * effectiveRate;

  const mileageSavings = business.usesPersonalVehicle && totalMiles > 0
    ? totalMiles * 0.70 * effectiveRate
    : business.usesPersonalVehicle
    ? 1500 * 0.70 * effectiveRate // estimated if no miles logged
    : 0;

  const sepIraMax = Math.min(ytdProfit * 0.25, 69000);
  const sepIraSavings = isPassThrough ? sepIraMax * effectiveRate : 0;

  const homeOfficeSavings = 300 * 5 * effectiveRate; // $5/sqft safe harbor × 300 sqft max = $1,500 deduction

  const section179Savings = 2500 * effectiveRate; // conservative estimate if any equipment

  const healthInsuranceSavings = isPassThrough ? 6000 * effectiveRate : 0;

  const mealsSavings = ytdExpenses * 0.01 * 0.50 * effectiveRate; // 1% of expenses as potential meals * 50% deductible

  const phoneInternetSavings = 1800 * effectiveRate; // $150/mo × 12mo

  const sCorpSavings = isLLC && ytdProfit > 40000
    ? ytdProfit * 0.15 * 0.50 // rough SE tax savings from S-Corp election
    : 0;

  const rules: DeductionRule[] = [
    {
      id: "qbi",
      title: "Section 199A QBI Deduction (20%)",
      description: `As a ${business.entityType === "sole_prop" ? "sole proprietor" : "pass-through entity"}, you can deduct 20% of qualified business income — potentially your largest deduction.`,
      eligible: isPassThrough && ytdProfit > 0,
      reason: isPassThrough ? `Eligible as ${business.entityType}` : "Not available for C-Corps",
      estimatedSavings: qbiSavings,
      form: "Schedule C + Form 1040",
      difficulty: "moderate",
    },
    {
      id: "half_se",
      title: "Deduct Half of Self-Employment Tax",
      description: "The IRS lets self-employed individuals deduct 50% of SE tax from gross income — an above-the-line deduction that reduces AGI.",
      eligible: isPassThrough,
      reason: isPassThrough ? "Automatically eligible as self-employed" : "N/A — you pay payroll tax as employee",
      estimatedSavings: halfSETax * effectiveRate,
      form: "Schedule SE",
      difficulty: "easy",
    },
    {
      id: "sep_ira",
      title: "SEP-IRA / Solo 401(k) Contributions",
      description: `Contribute up to $${Math.round(sepIraMax).toLocaleString()} (25% of net profit, max $69,000 for 2024) to a SEP-IRA and deduct it fully.`,
      eligible: isPassThrough && ytdProfit > 5000,
      reason: ytdProfit > 5000 ? "Strong profit makes retirement contributions valuable" : "Low profit — contributions may not be worth setup cost",
      estimatedSavings: sepIraSavings,
      form: "Schedule 1 (Form 1040)",
      difficulty: "moderate",
    },
    {
      id: "vehicle",
      title: "Vehicle Mileage Deduction ($0.70/mile)",
      description: `Track every business mile. At $0.70/mile (2025 rate), ${totalMiles > 0 ? `your ${totalMiles.toLocaleString()} logged miles = $${(totalMiles * 0.70).toFixed(0)}` : "even 5,000 miles/year = $3,500 deduction"}.`,
      eligible: business.usesPersonalVehicle,
      reason: business.usesPersonalVehicle ? "You indicated personal vehicle use for business" : "No vehicle use indicated",
      estimatedSavings: mileageSavings,
      form: "Schedule C (Part II, Line 9)",
      difficulty: "easy",
    },
    {
      id: "home_office",
      title: "Home Office Deduction",
      description: "Use the simplified method: $5/sqft for up to 300 sqft of dedicated workspace ($1,500 max). No depreciation recapture risk.",
      eligible: true,
      reason: "Any business owner with a dedicated workspace at home qualifies",
      estimatedSavings: homeOfficeSavings,
      form: "Form 8829 or Schedule C",
      difficulty: "easy",
    },
    {
      id: "health_insurance",
      title: "Self-Employed Health Insurance",
      description: "100% of premiums paid for you, spouse, and dependents are deductible as an above-the-line deduction — reduces AGI directly.",
      eligible: isPassThrough,
      reason: isPassThrough ? "Self-employed individuals can deduct 100% of premiums" : "Only available to self-employed",
      estimatedSavings: healthInsuranceSavings,
      form: "Schedule 1 (Form 1040), Line 17",
      difficulty: "easy",
    },
    {
      id: "section_179",
      title: "Section 179 Equipment Expensing",
      description: "Instead of depreciating equipment over years, deduct the full cost in year one. Applies to computers, phones, tools, vehicles, and more.",
      eligible: true,
      reason: "Available to all businesses with purchased equipment",
      estimatedSavings: section179Savings,
      form: "Form 4562",
      difficulty: "moderate",
    },
    {
      id: "meals",
      title: "Business Meals (50% Deductible)",
      description: "Client meals, team lunches, and meals during business travel are 50% deductible. Must document business purpose, client name, and amount.",
      eligible: true,
      reason: "Any meal with a business purpose qualifies",
      estimatedSavings: mealsSavings,
      form: "Schedule C (Part II, Line 24b)",
      difficulty: "easy",
    },
    {
      id: "phone_internet",
      title: "Phone & Internet (Business %)",
      description: "The business-use percentage of your phone and home internet is deductible. Most small businesses claim 50–100% depending on usage.",
      eligible: true,
      reason: "Universal deduction for any business with communication costs",
      estimatedSavings: phoneInternetSavings,
      form: "Schedule C (Part II, Line 25)",
      difficulty: "easy",
    },
    {
      id: "s_corp_election",
      title: "S-Corp Election (Tax Strategy)",
      description: `At your profit level, electing S-Corp status could save significant SE tax by splitting income between salary and distributions. Best when profit consistently exceeds $40,000.`,
      eligible: isLLC && ytdProfit > 40000,
      reason: isLLC && ytdProfit > 40000
        ? `At $${Math.round(ytdProfit).toLocaleString()} profit, S-Corp election may save $${Math.round(sCorpSavings).toLocaleString()}/year`
        : ytdProfit <= 40000
        ? "S-Corp setup costs (~$2,000/yr) exceed benefits below $40K profit"
        : "Already an S-Corp or not an LLC",
      estimatedSavings: sCorpSavings,
      form: "Form 2553 (must file by March 15)",
      difficulty: "complex",
    },
  ];
  return rules.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
}

// ─── Components ───────────────────────────────────────────────────────────────

function QuarterCard({ label, due, period }: { label: string; due: Date; period: string }) {
  const days = daysUntil(due);
  const isPast = days < 0;
  const isUrgent = days >= 0 && days <= 14;
  const isSoon = days > 14 && days <= 45;

  return (
    <div className={`bg-white rounded-xl border p-4 ${isUrgent ? "border-red-200 bg-red-50" : isSoon ? "border-yellow-200 bg-yellow-50" : isPast ? "border-slate-200 opacity-60" : "border-slate-200"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900 text-sm">{label} Estimated Tax</p>
          <p className="text-xs text-slate-500 mt-0.5">{period}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
          isPast ? "bg-slate-100 text-slate-500" :
          isUrgent ? "bg-red-100 text-red-700" :
          isSoon ? "bg-yellow-100 text-yellow-700" :
          "bg-slate-100 text-slate-600"
        }`}>
          {isPast ? "Past" : days === 0 ? "Today!" : `${days}d`}
        </span>
      </div>
      <p className="text-xs text-slate-600 mt-2">
        Due {due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

function DeductionCard({ rule }: { rule: DeductionRule }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${rule.eligible ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
          rule.eligible ? "bg-green-100" : "bg-slate-100"
        }`}>
          {rule.eligible ? (
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-slate-900 text-sm">{rule.title}</p>
            <div className="text-right flex-shrink-0">
              {rule.estimatedSavings > 0 && (
                <p className="text-sm font-semibold text-green-700">
                  ~${Math.round(rule.estimatedSavings).toLocaleString()}
                </p>
              )}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                rule.difficulty === "easy" ? "bg-green-50 text-green-600" :
                rule.difficulty === "moderate" ? "bg-yellow-50 text-yellow-700" :
                "bg-orange-50 text-orange-700"
              }`}>{rule.difficulty}</span>
            </div>
          </div>
          <p className={`text-xs mt-1 ${rule.eligible ? "text-slate-500" : "text-slate-400"}`}>
            {rule.reason}
          </p>
          {expanded && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-600">{rule.description}</p>
              <p className="text-xs text-slate-400">Form: <span className="text-slate-600 font-medium">{rule.form}</span></p>
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1.5 font-medium"
          >
            {expanded ? "Less ↑" : "Details ↓"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MissedDeductionCard({ item }: { item: MissedDeduction }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border p-4 ${
      item.priority === "high" ? "border-orange-200" :
      item.priority === "medium" ? "border-yellow-200" :
      "border-slate-200"
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
          item.priority === "high" ? "bg-orange-400" :
          item.priority === "medium" ? "bg-yellow-400" :
          "bg-slate-300"
        }`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-slate-900 text-sm">{item.title}</p>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-semibold text-green-700">
                ~${Math.round(item.estimatedAnnualSavings).toLocaleString()}/yr
              </p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                item.difficulty === "easy" ? "bg-green-50 text-green-600" :
                item.difficulty === "moderate" ? "bg-yellow-50 text-yellow-700" :
                "bg-orange-50 text-orange-700"
              }`}>{item.difficulty}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
          {expanded && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <div>
                <p className="text-xs font-medium text-slate-700">Evidence from your data:</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.evidenceFromData}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-700">How to claim:</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.howToClaim}</p>
              </div>
              {item.irsForm && (
                <p className="text-xs text-slate-400">Form: <span className="text-slate-600 font-medium">{item.irsForm}</span></p>
              )}
              {item.documentationNeeded.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-700">Documentation needed:</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {item.documentationNeeded.map((d, i) => (
                      <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-slate-300 flex-shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 hover:text-blue-800 mt-1.5 font-medium"
          >
            {expanded ? "Less ↑" : "See how ↓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TaxesPage() {
  const { business } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<TaxAIResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"strategies" | "ai-analysis">("strategies");

  useEffect(() => {
    if (!business?.id) return;
    Promise.all([
      getReceipts(business.id),
      getQuotes(business.id),
    ]).then(([r, q]) => {
      setReceipts(r);
      setQuotes(q);
      setLoading(false);
    });
  }, [business?.id]);

  const runAIAnalysis = useCallback(async () => {
    if (!business?.id) return;
    setAiLoading(true);
    setAiError(null);
    setActiveTab("ai-analysis");
    try {
      const res = await fetch("/api/ai/analyze-taxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Analysis failed");
      }
      setAiResult(await res.json());
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setAiLoading(false);
    }
  }, [business?.id]);

  if (!business || loading) {
    return (
      <AILoadingScreen
        title="Loading tax intelligence"
        steps={["Fetching receipts", "Loading transactions", "Calculating deductions"]}
        variant="inline"
      />
    );
  }

  // ── Computed financials ──────────────────────────────────────────────────────
  const financeSummary = summarizeFinances(quotes, receipts);
  const ytdRevenue = financeSummary.paidRevenue;
  const ytdExpenses = financeSummary.deductibleExpenses;
  const ytdProfit = Math.max(0, ytdRevenue - ytdExpenses);
  const totalMiles = receipts.reduce((s, r) => s + (r.associatedMileage ?? 0), 0);

  const isPassThrough = ["sole_prop", "llc", "partnership"].includes(business.entityType);
  const seTax = isPassThrough ? ytdProfit * 0.9235 * 0.153 : 0;
  const estimatedTaxOwed = ytdProfit * 0.30;
  const currentYr = new Date().getFullYear();
  const quarters = getQuarterlyDates(currentYr);

  const deductions = computeStaticDeductions(business, ytdProfit, totalMiles, ytdExpenses);
  const totalPotentialSavings = deductions.filter((d) => d.eligible).reduce((s, d) => s + d.estimatedSavings, 0);
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tax Intelligence</h1>
          <p className="text-slate-500 text-sm mt-1">Deduction strategies and AI-powered tax analysis for {business.businessName}</p>
        </div>
        <button
          onClick={runAIAnalysis}
          disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {aiLoading ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" /> Analyzing...</>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.13A3.5 3.5 0 0112 18.5a3.5 3.5 0 01-3.093-1.47l-.347-.13z" />
              </svg>
              AI Deep Dive
            </>
          )}
        </button>
      </div>

      {/* Tax health summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">YTD Net Profit</p>
          <p className="text-xl font-bold text-slate-900 mt-1">${Math.round(ytdProfit).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">{business.entityType.replace("_", " ")}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Est. Tax Liability</p>
          <p className="text-xl font-bold text-red-600 mt-1">${Math.round(estimatedTaxOwed).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">~30% effective rate</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Potential Savings</p>
          <p className="text-xl font-bold text-green-700 mt-1">${Math.round(totalPotentialSavings).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">from eligible deductions</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Miles Tracked</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalMiles.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">${(totalMiles * 0.70).toFixed(0)} deductible</p>
        </div>
      </div>

      {/* Quarterly tax calendar */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Estimated Tax Calendar ({currentYr})</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quarters.map((q) => (
            <QuarterCard key={q.label} {...q} />
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Pay ~25% of estimated annual tax per quarter. Use IRS Form 1040-ES. Underpayment penalty applies if you owe &gt;$1,000.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: "strategies", label: "Deduction Strategies" },
          { id: "ai-analysis", label: "AI Analysis" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
            {t.id === "ai-analysis" && aiResult && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 bg-orange-100 text-orange-700 text-xs rounded-full font-bold">
                {aiResult.missedDeductions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Strategies tab */}
      {activeTab === "strategies" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>{deductions.filter((d) => d.eligible).length} deductions</strong> you likely qualify for, worth an estimated{" "}
              <strong>${Math.round(totalPotentialSavings).toLocaleString()}</strong> in tax savings.
              Sorted by estimated impact.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {deductions.map((rule) => (
              <DeductionCard key={rule.id} rule={rule} />
            ))}
          </div>

          {/* SE tax breakdown */}
          {isPassThrough && ytdProfit > 0 && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-800 text-sm mb-3">Self-Employment Tax Breakdown</h3>
              <div className="space-y-2 text-sm">
                {[
                  { label: "Net profit", value: `$${Math.round(ytdProfit).toLocaleString()}` },
                  { label: "× 92.35% (SE income)", value: `$${Math.round(ytdProfit * 0.9235).toLocaleString()}` },
                  { label: "× 15.3% (SE tax rate)", value: `$${Math.round(seTax).toLocaleString()}` },
                  { label: "÷ 2 (deductible half)", value: `-$${Math.round(seTax / 2).toLocaleString()}` },
                  { label: "Effective SE cost", value: `$${Math.round(seTax / 2).toLocaleString()}`, highlight: true },
                ].map((row) => (
                  <div key={row.label} className={`flex justify-between ${row.highlight ? "font-semibold text-slate-900 border-t border-slate-200 pt-2" : "text-slate-600"}`}>
                    <span>{row.label}</span>
                    <span className={row.label.startsWith("÷") ? "text-green-600" : ""}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Analysis tab */}
      {activeTab === "ai-analysis" && (
        <div className="space-y-4">
          {!aiResult && !aiLoading && !aiError && (
            <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.13A3.5 3.5 0 0112 18.5a3.5 3.5 0 01-3.093-1.47l-.347-.13z" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium mb-1">AI-Powered Tax Analysis</p>
              <p className="text-slate-400 text-sm mb-4 max-w-sm mx-auto">
                Gemini scans your actual receipts and bank transactions to find missed deductions and mis-categorized expenses.
              </p>
              <button
                onClick={runAIAnalysis}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Analyze my expenses
              </button>
            </div>
          )}

          {aiLoading && (
            <AILoadingScreen
              title="Scanning your expenses"
              steps={[
                "Reading all receipts",
                "Analyzing bank transactions",
                "Finding missed deductions",
                "Checking for mis-categorized expenses",
                "Calculating potential savings",
              ]}
              variant="inline"
            />
          )}

          {aiError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
              {aiError}
            </div>
          )}

          {aiResult && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-800">{aiResult.summary}</p>
              </div>

              {/* Savings banner */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">${Math.round(aiResult.totalEstimatedSavings).toLocaleString()}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Total potential savings</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-2xl font-bold text-orange-600">{aiResult.missedDeductions.filter((d) => d.priority === "high").length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">High-priority flags</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{aiResult.actionItems.length}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Action items</p>
                </div>
              </div>

              {/* Missed deductions */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Missed / Under-Claimed Deductions</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {aiResult.missedDeductions.map((item, i) => (
                    <MissedDeductionCard key={i} item={item} />
                  ))}
                </div>
              </div>

              {/* Action items */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3">Action Items</h3>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {aiResult.actionItems.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700">{item.action}</p>
                        <div className="flex gap-3 mt-1">
                          {item.deadline && (
                            <span className="text-xs text-slate-400">Due: {item.deadline}</span>
                          )}
                          <span className="text-xs text-green-600 font-medium">{item.estimatedImpact}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Entity advice */}
              {aiResult.entityAdvice && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-purple-900 text-sm">Entity Structure Advice</p>
                      <p className="text-sm text-purple-700 mt-1">{aiResult.entityAdvice}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={runAIAnalysis}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Re-run analysis →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
        Tax estimates are for informational purposes only and not tax advice. Consult a CPA or enrolled agent before making tax decisions. Savings estimates assume a ~30% combined federal + self-employment effective rate.
      </p>
    </div>
  );
}
