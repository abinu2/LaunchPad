"use client";

import { useState } from "react";
import type { OnboardingAnswers } from "@/types/onboarding";

interface Props {
  onComplete: (answers: OnboardingAnswers) => void;
  error: string | null;
}

type Step = {
  id: keyof OnboardingAnswers;
  question: string;
  subtext?: string;
  options?: string[];
  placeholder?: string;
  showIf?: (answers: Partial<OnboardingAnswers>) => boolean;
};

const STEPS: Step[] = [
  {
    id: "businessDescription",
    question: "What business do you want to start?",
    subtext: "Describe it in your own words — location, what you do, who you serve.",
    placeholder: "e.g. I want to start a mobile car detailing business in Tempe, Arizona",
  },
  {
    id: "workStructure",
    question: "Will you be working alone, or do you plan to have help?",
    options: ["Just me", "Hiring employees", "Business partner(s)", "Using contractors"],
  },
  {
    id: "personalAssets",
    question: "Will you use your personal vehicle, home, or equipment for business?",
    options: [
      "Personal vehicle",
      "Home office",
      "Both vehicle and home",
      "Neither — dedicated business space",
    ],
  },
  {
    id: "incomeSource",
    question: "Will this be your only income, or do you have another job?",
    options: [
      "This is a side project — I have a full-time job",
      "This will be my only income",
      "I'm transitioning from a job",
    ],
  },
  {
    id: "businessName",
    question: "Have you picked a business name?",
    subtext: "I'll check trademark availability, domain, and social handles. Leave blank if you haven't decided.",
    placeholder: "e.g. Shine Pro Detailing (or leave blank)",
  },
  {
    id: "estimatedRevenue",
    question: "What's your estimated monthly revenue in the first year?",
    options: [
      "Under $2,000/month",
      "$2,000–5,000/month",
      "$5,000–10,000/month",
      "Over $10,000/month",
      "No idea yet",
    ],
  },
  {
    id: "helpDetails",
    question: "Tell me about the help you'll need — what will they do and how often?",
    subtext: "This helps me check employee vs. contractor classification — getting this wrong costs $50/day per worker in most states.",
    placeholder: "e.g. I'll hire a helper on weekends for 2-3 jobs, they'll use my equipment",
    showIf: (a) =>
      a.workStructure === "Hiring employees" || a.workStructure === "Using contractors",
  },
];

export function OnboardingChat({ onComplete, error }: Props) {
  const [answers, setAnswers] = useState<Partial<OnboardingAnswers>>({});
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [inputValue, setInputValue] = useState("");

  const visibleSteps = STEPS.filter(
    (s) => !s.showIf || s.showIf(answers)
  );

  const currentStep = visibleSteps[currentStepIndex];
  const progress = Math.round(((currentStepIndex) / visibleSteps.length) * 100);

  const handleAnswer = (value: string) => {
    const updated = { ...answers, [currentStep.id]: value };
    setAnswers(updated);
    setInputValue("");

    const nextIndex = currentStepIndex + 1;
    const nextVisibleSteps = STEPS.filter((s) => !s.showIf || s.showIf(updated));

    if (nextIndex >= nextVisibleSteps.length) {
      onComplete(updated as OnboardingAnswers);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    handleAnswer(inputValue.trim());
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-slate-200">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Step counter */}
          <p className="text-sm text-slate-400 mb-6 text-center">
            Step {currentStepIndex + 1} of {visibleSteps.length}
          </p>

          {/* Conversation history */}
          <div className="space-y-3 mb-8">
            {visibleSteps.slice(0, currentStepIndex).map((step, idx) => (
              <div key={`${step.id}-${idx}`} className="flex gap-3">
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-1">{step.question}</p>
                  <div className="inline-block bg-blue-50 text-blue-800 text-sm px-3 py-2 rounded-xl rounded-tl-sm">
                    {answers[step.id]}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Current question */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-slate-900">{currentStep.question}</p>
                {currentStep.subtext && (
                  <p className="text-sm text-slate-500 mt-1">{currentStep.subtext}</p>
                )}
              </div>
            </div>

            {currentStep.options ? (
              <div className="grid gap-2">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    className="text-left px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-700 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={handleTextSubmit} className="flex gap-2">
                <input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={currentStep.placeholder}
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() && currentStep.id !== "businessName" && currentStep.id !== "helpDetails"}
                  className="px-4 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </form>
            )}

            {/* Allow skipping optional text fields */}
            {!currentStep.options && (currentStep.id === "businessName" || currentStep.id === "helpDetails") && (
              <button
                onClick={() => handleAnswer("")}
                className="mt-2 text-xs text-slate-400 hover:text-slate-600"
              >
                Skip for now
              </button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error} — please try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
