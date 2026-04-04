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
  helpTip?: string;
  options?: { label: string; hint?: string }[] | string[];
  placeholder?: string;
  showIf?: (answers: Partial<OnboardingAnswers>) => boolean;
};

const STEPS: Step[] = [
  {
    id: "businessDescription",
    question: "What kind of business are you thinking about?",
    subtext: "Just describe it in your own words — what you do, where, and who you'd serve. No wrong answers here.",
    helpTip: "This helps us figure out what licenses and permits you'll need, and what kind of business structure makes sense for you.",
    placeholder: "e.g. I want to start a mobile car detailing business in Tempe, Arizona",
  },
  {
    id: "workStructure",
    question: "Will you be working alone, or do you plan to have help?",
    subtext: "This affects how your business is set up legally and what tax forms you'll need.",
    options: [
      { label: "Just me", hint: "Simplest setup — you're the sole owner and operator" },
      { label: "Hiring employees", hint: "People who work set hours and use your tools/equipment" },
      { label: "Business partner(s)", hint: "Someone who co-owns the business with you" },
      { label: "Using contractors", hint: "Freelancers or helpers you hire per job — they set their own hours" },
    ],
  },
  {
    id: "personalAssets",
    question: "Will you use your personal vehicle, home, or equipment for business?",
    subtext: "This matters for insurance and tax deductions. Using personal stuff for work can unlock write-offs.",
    helpTip: "A \"write-off\" means you can subtract part of the cost from your taxable income, so you pay less in taxes.",
    options: [
      { label: "Personal vehicle", hint: "You can deduct mileage or gas costs" },
      { label: "Home office", hint: "A dedicated workspace at home can be a deduction" },
      { label: "Both vehicle and home", hint: "Maximize your deductions" },
      { label: "Neither — dedicated business space", hint: "You'll rent or own a separate workspace" },
    ],
  },
  {
    id: "incomeSource",
    question: "Will this be your only income, or do you have another job?",
    subtext: "This helps us estimate your tax bracket and whether you need to make quarterly tax payments.",
    helpTip: "Quarterly taxes are payments you send to the IRS every 3 months when you're self-employed, instead of having taxes taken from a paycheck.",
    options: [
      { label: "This is a side project — I have a full-time job", hint: "Your employer already withholds some taxes" },
      { label: "This will be my only income", hint: "You'll likely need to pay estimated quarterly taxes" },
      { label: "I'm transitioning from a job", hint: "We'll help you plan the switch" },
    ],
  },
  {
    id: "businessName",
    question: "Have you picked a business name?",
    subtext: "We'll check if it's available for registration and if the domain is open. No pressure if you haven't decided yet.",
    placeholder: "e.g. Shine Pro Detailing (or leave blank)",
  },
  {
    id: "estimatedRevenue",
    question: "Roughly how much do you expect to bring in per month in the first year?",
    subtext: "A ballpark is fine — this helps us recommend the right business structure and tax strategy.",
    helpTip: "Revenue is the total money coming in before expenses. Don't worry about being exact — we'll refine this as you go.",
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
    subtext: "This helps us figure out if they should be classified as employees or contractors. Getting this wrong can lead to fines.",
    helpTip: "The IRS looks at things like: do they set their own hours? Do they use their own tools? If yes, they're likely a contractor. If you control when and how they work, they're an employee.",
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

  const [showHelp, setShowHelp] = useState(false);

  const handleAnswer = (value: string) => {
    const updated = { ...answers, [currentStep.id]: value };
    setAnswers(updated);
    setInputValue("");
    setShowHelp(false);

    const nextIndex = currentStepIndex + 1;
    const nextVisibleSteps = STEPS.filter((s) => !s.showIf || s.showIf(updated));

    if (nextIndex >= nextVisibleSteps.length) {
      onComplete(updated as OnboardingAnswers);
    } else {
      setCurrentStepIndex(nextIndex);
    }
  };

  /** Normalize options to { label, hint? } */
  const getOptions = (step: Step): { label: string; hint?: string }[] | undefined => {
    if (!step.options) return undefined;
    return step.options.map((o) => (typeof o === "string" ? { label: o } : o));
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
              <div className="flex-1">
                <p className="font-medium text-slate-900">{currentStep.question}</p>
                {currentStep.subtext && (
                  <p className="text-sm text-slate-500 mt-1">{currentStep.subtext}</p>
                )}
                {currentStep.helpTip && (
                  <button
                    type="button"
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-xs text-blue-500 hover:text-blue-700 mt-1.5 flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {showHelp ? "Got it" : "What does this mean?"}
                  </button>
                )}
                {showHelp && currentStep.helpTip && (
                  <div className="mt-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                    {currentStep.helpTip}
                  </div>
                )}
              </div>
            </div>

            {getOptions(currentStep) ? (
              <div className="grid gap-2">
                {getOptions(currentStep)!.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleAnswer(opt.label)}
                    className="text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-sm text-slate-700">{opt.label}</span>
                    {opt.hint && (
                      <span className="block text-xs text-slate-400 mt-0.5">{opt.hint}</span>
                    )}
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
