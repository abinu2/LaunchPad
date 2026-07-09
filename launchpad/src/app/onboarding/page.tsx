"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Rocket,
  FileText,
  Camera,
  ShieldCheck,
  Calculator,
  TrendingUp,
  Landmark,
  MessageSquareText,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { createBusiness, addComplianceItem } from "@/services/business-graph";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Button } from "@/components/ui/Button";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { OnboardingResults } from "@/components/onboarding/OnboardingResults";
import { OnboardingAnswers, OnboardingResult } from "@/types/onboarding";

// Disable static prerendering for this page since it requires Auth0 context
export const dynamic = "force-dynamic";

type Stage = "intro" | "chat" | "processing" | "results";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { business, loading: bizLoading, refreshBusiness } = useBusiness();
  const router = useRouter();

  const [stage, setStage] = useState<Stage>("intro");
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // If user already has a business, skip onboarding entirely
  useEffect(() => {
    if (!bizLoading && business) {
      router.replace("/dashboard");
    }
  }, [business, bizLoading, router]);

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
    if (!result || !user) return "";

    const businessId = await createBusiness(user.sub, {
      ...result.businessProfile,
      ownerEmail: user.email ?? "",
      onboardingStage: "formation",
      // Mark onboarding as done — dashboard layout checks business existence,
      // so as long as this record exists the user won't be sent back here.
      completedSteps: ["onboarding_questionnaire", "entity_recommendation", "compliance_mapping"],
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

    // Add compliance items in parallel for speed
    await Promise.all(
      result.complianceItems.map((item) =>
        addComplianceItem(businessId, {
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
        })
      )
    );

    // Refresh context so BusinessContext has the new record — this prevents
    // the dashboard layout from redirecting back to /onboarding
    await refreshBusiness();
    return businessId;
  };

  if (stage === "intro") {
    // Still checking if user already has a business — show nothing to avoid flash
    if (bizLoading) return null;

    const features = [
      {
        icon: FileText,
        title: "Contract Analysis",
        desc: "Upload any contract and get a plain-English breakdown of what it means, what to watch out for, and what you owe.",
        color: "bg-blue-500/10 text-blue-400",
      },
      {
        icon: Camera,
        title: "Receipt Scanner",
        desc: "Snap a photo of any receipt. We categorize it, flag tax deductions, and track your spending automatically.",
        color: "bg-green-500/10 text-[#00CF31]",
      },
      {
        icon: ShieldCheck,
        title: "Compliance Tracking",
        desc: "We identify every license, permit, and filing your business needs — and remind you before deadlines hit.",
        color: "bg-purple-500/10 text-purple-400",
      },
      {
        icon: Calculator,
        title: "Tax Insights",
        desc: "See estimated quarterly taxes, deduction opportunities, and what you should set aside — no accounting degree needed.",
        color: "bg-amber-500/10 text-amber-400",
      },
      {
        icon: TrendingUp,
        title: "Growth Tools",
        desc: "Create professional quotes, discover funding, and get AI-powered suggestions to grow your revenue.",
        color: "bg-cyan-500/10 text-cyan-400",
      },
      {
        icon: Landmark,
        title: "Cash Flow Tracking",
        desc: "Connect your bank for a real-time view of income, expenses, and cash on hand — no spreadsheets required.",
        color: "bg-emerald-500/10 text-emerald-400",
      },
    ];

    const workflowSteps = [
      { icon: MessageSquareText, label: "Answer a few questions" },
      { icon: Sparkles, label: "Get your business plan" },
      { icon: CheckCircle2, label: "Start managing your business" },
    ];

    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 py-12">
        <div className="max-w-3xl w-full">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-[#00CF31] rounded-2xl mb-5 shadow-lg shadow-green-500/20">
              <Rocket className="w-7 h-7 text-black" strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Your business, simplified</h1>
            <p className="text-white/60 text-lg max-w-md mx-auto">
              Answer a few quick questions and we&apos;ll set up everything you need — no jargon, no guesswork.
            </p>
          </div>

          {/* Workflow overview */}
          <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10">
            {workflowSteps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/8 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-4 h-4 text-white/70" strokeWidth={1.75} />
                  </div>
                  <span className="hidden sm:inline text-sm text-white/50">{step.label}</span>
                </div>
                {i < workflowSteps.length - 1 && (
                  <div className="w-6 sm:w-10 h-px bg-white/15" />
                )}
              </div>
            ))}
          </div>

          {/* Feature cards — 6, symmetric 3x2 grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
            {features.map((f) => (
              <div key={f.title} className="bg-white/8 backdrop-blur rounded-xl border border-white/10 p-4 flex gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${f.color}`}>
                  <f.icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-medium text-white text-sm">{f.title}</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center">
            <Button onClick={() => setStage("chat")} size="lg" className="px-8">
              Let&apos;s get started
            </Button>
            <p className="text-white/40 text-sm mt-3">Takes about 3 minutes · Just a conversation, no forms</p>
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
