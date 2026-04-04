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
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-6 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-3">Let&apos;s build your business</h1>
          <p className="text-slate-600 text-lg mb-2">
            Tell me what you want to start, and I&apos;ll create a personalized plan — entity type, licenses, taxes, and your first contract.
          </p>
          <p className="text-slate-500 text-sm mb-8">Takes about 3 minutes. No forms, just a conversation.</p>
          <Button onClick={() => setStage("chat")} className="px-8 py-3 text-base">
            Get started
          </Button>
        </div>
      </div>
    );
  }

  if (stage === "processing") {
    return (
      <LoadingScreen
        title="Building your business plan"
        subtitle="Gemini is analyzing your answers"
        steps={[
          "Checking entity requirements for your state",
          "Mapping compliance obligations",
          "Identifying licenses and permits",
          "Building your formation checklist",
          "Drafting your first contract template",
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
