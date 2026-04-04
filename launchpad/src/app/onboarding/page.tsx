"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { createBusiness, addComplianceItem } from "@/services/business-graph";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { OnboardingResults } from "@/components/onboarding/OnboardingResults";
import type { OnboardingAnswers, OnboardingResult } from "@/types/onboarding";

type Stage = "intro" | "chat" | "processing" | "results";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { refreshBusiness } = useBusiness();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("intro");
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChatComplete = async (completedAnswers: OnboardingAnswers) => {
    setStage("processing");
    setError(null);

    try {
      const res = await fetch("/api/ai/business-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(completedAnswers),
      });

      if (!res.ok) throw new Error("AI analysis failed");
      const data: OnboardingResult = await res.json();
      setResult(data);
      setStage("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("chat");
    }
  };

  const handleSaveBusiness = async () => {
    if (!result || !user) return;

    const businessId = await createBusiness(user.sub, {
      ...result.businessProfile,
      ownerEmail: user.email ?? "",
      financials: {
        monthlyRevenueAvg: 0,
        monthlyExpenseAvg: 0,
        profitMargin: 0,
        totalRevenueYTD: 0,
        totalExpensesYTD: 0,
        currentCashBalance: null,
        lastUpdated: null,
      },
    });

    for (const item of result.complianceItems) {
      await addComplianceItem(businessId, {
        ...item,
        businessId,
        status: "not_started",
        obtainedDate: null,
        expirationDate: null,
        renewalDate: null,
        daysUntilDue: null,
        reminderSent30Days: false,
        reminderSent14Days: false,
        reminderSent3Days: false,
        lastCheckedAt: new Date().toISOString(),
        proofUrl: null,
      });
    }

    await refreshBusiness();
    router.replace("/dashboard");
  };

  if (stage === "intro") {
    const features = [
      {
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        title: "Contract Analysis",
        desc: "Upload any contract and get a plain-English breakdown of what it means, what to watch out for, and what you owe.",
        color: "bg-blue-50 text-blue-600",
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        title: "Receipt Scanner",
        desc: "Snap a photo of any receipt. We categorize it, flag tax deductions, and track your spending automatically.",
        color: "bg-green-50 text-green-600",
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        ),
        title: "Compliance Tracking",
        desc: "We identify every license, permit, and filing your business needs — and remind you before deadlines hit.",
        color: "bg-purple-50 text-purple-600",
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        title: "Tax Insights",
        desc: "See estimated quarterly taxes, deduction opportunities, and what you should set aside — no accounting degree needed.",
        color: "bg-amber-50 text-amber-600",
      },
      {
        icon: (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
        title: "Growth Tools",
        desc: "Create professional quotes, discover funding, and get AI-powered suggestions to grow your revenue.",
        color: "bg-cyan-50 text-cyan-600",
      },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-600 rounded-2xl mb-5 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Your business, simplified</h1>
            <p className="text-slate-600 text-lg max-w-md mx-auto">
              Answer a few quick questions and we&apos;ll set up everything you need — no jargon, no guesswork.
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {features.map((f) => (
              <div key={f.title} className="bg-white/80 backdrop-blur rounded-xl border border-slate-200/60 p-4 flex gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${f.color}`}>
                  {f.icon}
                </div>
                <div>
                  <p className="font-medium text-slate-900 text-sm">{f.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button onClick={() => setStage("chat")} className="px-8 py-3 text-base">
              Let&apos;s get started
            </Button>
            <p className="text-slate-400 text-sm mt-3">Takes about 3 minutes · Just a conversation, no forms</p>
          </div>
        </div>
      </div>
    );
  }

  if (stage === "processing") {
    return (
      <LoadingScreen
        title="Building your business plan"
        subtitle="Analyzing your answers..."
        steps={[
          "Checking entity requirements for your state",
          "Mapping compliance obligations",
          "Identifying licenses and permits",
          "Building your formation checklist",
        ]}
      />
    );
  }

  if (stage === "chat") {
    return <OnboardingChat onComplete={handleChatComplete} error={error} />;
  }

  if (stage === "results" && result) {
    return <OnboardingResults result={result} onSave={handleSaveBusiness} />;
  }

  return null;
}
