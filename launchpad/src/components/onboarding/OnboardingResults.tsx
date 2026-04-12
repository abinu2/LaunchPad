"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PlaidConnectButton } from "@/components/plaid/PlaidConnectButton";
import { getBusiness, updateBusiness } from "@/services/business-graph";
import type { OnboardingResult } from "@/types/onboarding";

interface Props {
  result: OnboardingResult;
  // return created businessId so parent can offer bank connect before navigation
  onSave: () => Promise<string>;
}

const riskColor = {
  low: "bg-green-500/15 text-green-400",
  medium: "bg-amber-500/15 text-amber-400",
  high: "bg-red-500/15 text-red-400",
};

export function OnboardingResults({ result, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>("entity");
  const [bankConnected, setBankConnected] = useState(false);
  const [savedBusinessId, setSavedBusinessId] = useState<string | null>(null);
  const [bankSkipped, setBankSkipped] = useState(false);
  const router = useRouter();

  const handleSave = async (navigateAfter = true) => {
    setSaving(true);
    try {
      const id = await onSave();
      setSavedBusinessId(id || null);
      if (navigateAfter && id) {
        router.replace("/dashboard");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <div className="min-h-screen bg-white/5">
      {/* Header */}
      <div className="topbar-glass border-b border-white/8 px-4 py-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">
              Your plan for {result.businessProfile.businessName || "your business"}
            </h1>
          </div>
          <p className="text-white/50 text-sm ml-11">
            {result.formationChecklist.length} steps to launch · {result.complianceItems.length} compliance requirements identified
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Urgent warnings */}
        {result.urgentWarnings.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">⚠️ Important heads-up</p>
            <ul className="space-y-1">
              {result.urgentWarnings.map((w: string, i: number) => (
                <li key={i} className="text-sm text-amber-700">• {w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Entity recommendation */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => toggle("entity")}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🏢</span>
              <div>
                <p className="font-semibold text-white">Recommended: {result.entityRecommendation.recommended.replace("_", " ").toUpperCase()}</p>
                <p className="text-sm text-white/50">Filing cost: ${result.entityRecommendation.filingCost} · {result.entityRecommendation.processingTime}</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-white/40 transition-transform ${expanded === "entity" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded === "entity" && (
            <div className="px-5 pb-5 border-t border-white/8">
              <p className="text-sm text-white/70 mt-3 mb-3">{result.entityRecommendation.reasoning}</p>
              {result.entityRecommendation.alternativeConsiderations && (
                <p className="text-xs text-white/50 mb-3">{result.entityRecommendation.alternativeConsiderations}</p>
              )}
              {result.entityRecommendation.filingUrl && (
                <a
                  href={result.entityRecommendation.filingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-[#00CF31] hover:underline"
                >
                  File online →
                </a>
              )}
            </div>
          )}
        </div>

        {/* Name analysis */}
        {result.nameAnalysis.name && (
          <div className="glass-card overflow-hidden">
            <button
              onClick={() => toggle("name")}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🔍</span>
                <div>
                  <p className="font-semibold text-white">Name: &quot;{result.nameAnalysis.name}&quot;</p>
                  <p className="text-sm text-white/50">
                    Trademark risk: <span className={`font-medium ${result.nameAnalysis.trademarkRisk === "low" ? "text-[#00CF31]" : result.nameAnalysis.trademarkRisk === "medium" ? "text-amber-400" : "text-red-400"}`}>{result.nameAnalysis.trademarkRisk}</span>
                  </p>
                </div>
              </div>
              <svg className={`w-5 h-5 text-white/40 transition-transform ${expanded === "name" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded === "name" && (
              <div className="px-5 pb-5 border-t border-white/8">
                <div className="mt-3 flex gap-4 text-sm">
                  <span className={result.nameAnalysis.available ? "text-[#00CF31]" : "text-red-400"}>
                    {result.nameAnalysis.available ? "✓" : "✗"} Entity name available
                  </span>
                  <span className={result.nameAnalysis.domainAvailable ? "text-[#00CF31]" : "text-red-400"}>
                    {result.nameAnalysis.domainAvailable ? "✓" : "✗"} .com domain
                  </span>
                </div>
                {result.nameAnalysis.suggestions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-white/50 mb-2">Alternative suggestions:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.nameAnalysis.suggestions.map((s: string, i: number) => (
                        <span key={i} className="text-xs bg-white/8 text-white/70 px-2 py-1 rounded-md">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Formation checklist */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => toggle("checklist")}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">✅</span>
              <div>
                <p className="font-semibold text-white">Formation checklist</p>
                <p className="text-sm text-white/50">{result.formationChecklist.length} steps to legally launch</p>
              </div>
            </div>
            <svg className={`w-5 h-5 text-white/40 transition-transform ${expanded === "checklist" ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expanded === "checklist" && (
            <div className="border-t border-white/8">
              {result.formationChecklist.map((item: OnboardingResult["formationChecklist"][0], i: number) => (
                <div key={item.id} className="flex gap-3 px-5 py-3 border-b border-white/5 last:border-0">
                  <div className="w-6 h-6 rounded-full bg-white/8 text-white/50 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-medium">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.title}</p>
                    <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/40">{item.estimatedTime}</span>
                      {item.estimatedCost > 0 && (
                        <span className="text-xs text-white/40">${item.estimatedCost}</span>
                      )}
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs text-[#00CF31] hover:underline">
                          Link →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Key insights */}
        {result.keyInsights.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">💡 Key insights for your business</p>
            <ul className="space-y-1.5">
              {result.keyInsights.map((insight: string, i: number) => (
                <li key={i} className="text-sm text-blue-400">• {insight}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Bank connection — optional, non-coercive */}
        <div className="glass-card p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-white text-sm">Connect your bank for deeper insights</p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Linking your bank lets us automatically track income and expenses, spot tax deductions you might miss,
                and give you real-time cash flow visibility. Your data stays private and encrypted.
              </p>
              {bankConnected ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#00CF31]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Bank connected — you&apos;re all set
                </div>
              ) : savedBusinessId ? (
                <div className="mt-3 flex items-center gap-3">
                  <PlaidConnectButton
                    businessId={savedBusinessId}
                    onSuccess={() => {
                      setBankConnected(true);
                      // Navigate to dashboard after a short delay so the success state shows
                      setTimeout(() => router.replace("/dashboard"), 1200);
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Link bank account
                  </PlaidConnectButton>
                  <button
                    onClick={async () => {
                      if (!savedBusinessId) return;
                      try {
                        const existing = await getBusiness(savedBusinessId);
                        const steps = existing?.completedSteps ?? [];
                        if (!steps.includes("bank_skipped")) steps.push("bank_skipped");
                        await updateBusiness(savedBusinessId, { completedSteps: steps });
                      } catch {
                        // non-blocking
                      }
                      // Always navigate to dashboard whether skip succeeds or not
                      router.replace("/dashboard");
                    }}
                    className="text-xs text-white/50 underline"
                  >
                    Skip for now
                  </button>
                  <span className="text-xs text-white/40">Optional — you can do this later from your dashboard</span>
                </div>
              ) : (
                <div className="mt-2 text-xs text-white/40">
                  <div>You can connect your bank from the dashboard after saving your plan.</div>
                  <div className="mt-2 flex gap-2">
                    <Button onClick={() => handleSave(true)} loading={saving} className="py-2 px-3 text-sm">Save and go to dashboard</Button>
                    <Button onClick={() => handleSave(false)} loading={saving} className="py-2 px-3 text-sm">Save & connect bank</Button>
                  </div>
                </div>
              )}
              {bankSkipped && <p className="text-xs text-white/40 mt-2">You skipped bank connection — you can link it anytime from dashboard.</p>}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2 pb-8">
          <Button onClick={() => handleSave(true)} loading={saving} className="w-full py-3 text-base">
            Save my plan and go to dashboard
          </Button>
          <p className="text-center text-xs text-white/40 mt-3">
            Your plan is saved and updated as your business grows.
          </p>
        </div>
      </div>
    </div>
  );
}
