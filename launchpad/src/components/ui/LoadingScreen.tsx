"use client";

import { useEffect, useState } from "react";

// ─── Animated orb background ─────────────────────────────────────────────────

function OrbField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-orb-1" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-orb-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl animate-orb-3" />
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-particle"
          style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%`, animationDelay: `${i * 0.4}s`, animationDuration: `${2.5 + i * 0.3}s` }}
        />
      ))}
    </div>
  );
}

// ─── Pulsing logo mark ────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-8">
      <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping-slow" />
      <div className="absolute inset-1 rounded-xl bg-blue-500/10 animate-pulse" />
      <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Cycling step list ────────────────────────────────────────────────────────

interface StepListProps { steps: string[]; intervalMs?: number; }

function StepList({ steps, intervalMs = 1800 }: StepListProps) {
  const [active, setActive] = useState(0);
  const [done, setDone] = useState<number[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setDone((prev) => [...prev, active]);
      setActive((prev) => (prev + 1) % steps.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, steps.length, intervalMs]);

  return (
    <ul className="mt-6 space-y-2 text-left max-w-xs mx-auto">
      {steps.map((step, i) => {
        const isDone = done.includes(i);
        const isActive = active === i;
        return (
          <li key={step} className={`flex items-center gap-3 text-sm transition-all duration-500 ${isActive ? "opacity-100 translate-x-0" : isDone ? "opacity-50" : "opacity-30"}`}>
            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${isDone ? "bg-green-500" : isActive ? "bg-blue-500 animate-pulse" : "bg-slate-200"}`}>
              {isDone ? (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : isActive ? (
                <span className="w-2 h-2 bg-white rounded-full" />
              ) : (
                <span className="w-2 h-2 bg-slate-300 rounded-full" />
              )}
            </span>
            <span className={isActive ? "text-slate-800 font-medium" : "text-slate-500"}>{step}</span>
          </li>
        );
      })}
    </ul>
  );
}

function ProgressBar({ progress }: { progress?: number }) {
  return (
    <div className="mt-6 w-full max-w-xs mx-auto">
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        {progress !== undefined ? (
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
        ) : (
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-shimmer" />
        )}
      </div>
      {progress !== undefined && <p className="text-xs text-slate-400 text-right mt-1">{Math.round(progress)}%</p>}
    </div>
  );
}

// ─── Public generic variant ───────────────────────────────────────────────────

interface LoadingScreenProps {
  title?: string; subtitle?: string; steps?: string[]; progress?: number; variant?: "fullscreen" | "inline";
}

export function LoadingScreen({ title = "Loading...", subtitle, steps, progress, variant = "fullscreen" }: LoadingScreenProps) {
  const inner = (
    <div className="relative z-10 text-center px-6">
      <LogoMark />
      <h2 className="text-xl font-bold text-slate-900 animate-fade-in">{title}</h2>
      {subtitle && <p className="mt-2 text-sm text-slate-500 animate-fade-in-delay">{subtitle}</p>}
      {steps && <StepList steps={steps} />}
      <ProgressBar progress={progress} />
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="relative flex items-center justify-center py-24 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/50">
        <OrbField />
        {inner}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <OrbField />
      {inner}
    </div>
  );
}

// ─── AI generic loading screen ────────────────────────────────────────────────

const AI_STEPS = [
  "Connecting to the document analysis engine",
  "Reading document structure",
  "Extracting key clauses",
  "Assessing risk levels",
  "Generating recommendations",
  "Finalizing analysis",
];

interface AILoadingProps { title?: string; steps?: string[]; progress?: number; variant?: "fullscreen" | "inline"; }

export function AILoadingScreen({ title = "AI is thinking...", steps = AI_STEPS, progress, variant = "inline" }: AILoadingProps) {
  return <LoadingScreen title={title} subtitle="Powered by document analysis" steps={steps} progress={progress} variant={variant} />;
}

// ─── Contract analysis scanner ────────────────────────────────────────────────

const CLAUSE_LABELS = ["Reading parties...", "Checking payment terms...", "Scanning liability clauses...", "Reviewing termination rights...", "Checking indemnification...", "Assessing risk level...", "Building recommendations..."];

export function ContractScanLoader({ progress, stage }: { progress: number; stage: string }) {
  const [clauseIdx, setClauseIdx] = useState(0);
  const [visibleLines] = useState(() => Array.from({ length: 14 }, () => Math.random()));

  useEffect(() => {
    const id = setInterval(() => setClauseIdx((i) => (i + 1) % CLAUSE_LABELS.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="py-10 text-center space-y-5">
      {/* Animated document */}
      <div className="relative w-32 mx-auto">
        <div className="bg-white border-2 border-slate-200 rounded-lg shadow-lg px-4 pt-4 pb-6 space-y-2 relative overflow-hidden">
          {/* Page lines */}
          {visibleLines.map((w, i) => (
            <div key={i} className="h-1.5 bg-slate-200 rounded-full" style={{ width: `${55 + w * 40}%`, opacity: progress > (i / visibleLines.length) * 100 ? 1 : 0.3, transition: "opacity 0.4s" }} />
          ))}
          {/* Scan line */}
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-scan-line" style={{ top: "4%" }} />
          {/* AI badge */}
          <div className="absolute top-1 right-1">
            <div className="w-4 h-4 bg-gradient-to-br from-blue-500 to-violet-500 rounded-sm flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        {/* Corner fold */}
        <div className="absolute top-0 right-0 w-5 h-5 bg-slate-100 rounded-bl-lg border-b border-l border-slate-200" />
      </div>

      {/* Current clause label */}
      <div className="h-5">
        <p key={clauseIdx} className="text-sm text-blue-600 font-medium animate-slide-up">
          {CLAUSE_LABELS[clauseIdx]}
        </p>
      </div>

      {/* Stage description */}
      <p className="text-slate-500 text-sm">{stage}</p>

      {/* Progress bar */}
      <div className="max-w-xs mx-auto">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-400">{stage.includes("Upload") ? "Uploading" : "Analyzing"}</span>
          <span className="text-xs text-slate-400">{Math.round(progress)}%</span>
        </div>
      </div>

      <p className="text-xs text-slate-400">AI reads every clause — takes 20–40 seconds</p>
    </div>
  );
}

// ─── Receipt scanner ──────────────────────────────────────────────────────────

export function ReceiptScanLoader({ stage, progress }: { stage: "uploading" | "analyzing"; progress: number }) {
  const [scanPos, setScanPos] = useState(0);

  useEffect(() => {
    if (stage !== "analyzing") return;
    const id = setInterval(() => setScanPos((p) => (p + 1) % 100), 30);
    return () => clearInterval(id);
  }, [stage]);

  return (
    <div className="py-10 text-center space-y-4">
      <div className="relative w-24 mx-auto">
        {/* Receipt shape */}
        <div className="bg-white border-2 border-slate-200 rounded-lg shadow-md px-3 pt-3 pb-8 space-y-1.5 relative overflow-hidden">
          {[75, 55, 85, 45, 65, 90, 50].map((w, i) => (
            <div key={i} className="h-1 bg-slate-200 rounded-full transition-colors duration-300"
              style={{ width: `${w}%`, backgroundColor: stage === "analyzing" && progress > (i / 7) * 100 ? "#3b82f6" : undefined, opacity: stage === "analyzing" && progress > (i / 7) * 100 ? 1 : 0.4 }} />
          ))}
          {/* Scan line while analyzing */}
          {stage === "analyzing" && (
            <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-green-400 to-transparent pointer-events-none" style={{ top: `${4 + scanPos * 0.9}%`, transition: "top 0.03s linear" }} />
          )}
          {/* Jagged bottom edge (receipt style) */}
          <div className="absolute bottom-0 left-0 right-0 h-6" style={{
            backgroundImage: "radial-gradient(circle at 8px 100%, #f8fafc 10px, transparent 10px)",
            backgroundSize: "16px 20px",
            backgroundRepeat: "repeat-x",
          }} />
        </div>
        {/* Camera icon while uploading */}
        {stage === "uploading" && (
          <div className="absolute -top-3 -right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md animate-pulse">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}
      </div>

      <p className="text-slate-700 font-medium text-sm">
        {stage === "uploading" ? "Uploading receipt..." : "Reading receipt with AI..."}
      </p>

      <div className="max-w-xs mx-auto">
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: stage === "uploading" ? "linear-gradient(90deg,#3b82f6,#6366f1)" : "linear-gradient(90deg,#10b981,#3b82f6)" }} />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {stage === "analyzing" ? "Extracting vendor, amount, category & tax info..." : "Uploading securely..."}
      </p>
    </div>
  );
}

// ─── Contract draft generator ─────────────────────────────────────────────────

const CONTRACT_SECTIONS = ["Parties & Definitions", "Scope of Services", "Payment Terms", "Scheduling & Cancellation", "Limitation of Liability", "Indemnification", "Confidentiality", "Dispute Resolution", "Governing Law", "Signatures"];

export function ContractDraftLoader() {
  const [completedSections, setCompletedSections] = useState<number[]>([]);
  const [currentSection, setCurrentSection] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCompletedSections((prev) => [...prev, currentSection]);
      setCurrentSection((prev) => Math.min(prev + 1, CONTRACT_SECTIONS.length - 1));
    }, 2200);
    return () => clearInterval(id);
  }, [currentSection]);

  return (
    <div className="py-8 space-y-5">
      <div className="text-center space-y-2">
        <div className="relative w-16 h-16 mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center animate-pulse-glow">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          {/* Typing cursor */}
          <div className="absolute -bottom-1 -right-1 w-3 h-4 bg-blue-500 rounded-sm animate-typing-cursor" />
        </div>
        <p className="font-semibold text-slate-800">Drafting your contract</p>
        <p className="text-xs text-slate-400">Attorney-grade language · Gemini 2.5 Pro</p>
      </div>

      {/* Section tracker */}
      <div className="space-y-1.5 max-w-sm mx-auto">
        {CONTRACT_SECTIONS.map((section, i) => {
          const isDone = completedSections.includes(i);
          const isActive = currentSection === i && !isDone;
          const isPending = !isDone && !isActive;

          return (
            <div key={section} className={`flex items-center gap-2.5 py-1 px-3 rounded-lg transition-all duration-400 ${isActive ? "bg-blue-50 border border-blue-100" : ""}`}>
              <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isDone ? "bg-green-500" : isActive ? "bg-blue-500 animate-pulse" : "bg-slate-200"}`}>
                {isDone ? (
                  <svg className="w-2.5 h-2.5 text-white animate-draw-check" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
                  </svg>
                ) : isActive ? (
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                ) : null}
              </div>
              <span className={`text-xs transition-colors duration-300 ${isDone ? "text-slate-400 line-through" : isActive ? "text-blue-700 font-semibold" : isPending ? "text-slate-300" : "text-slate-500"}`}>
                {section}
              </span>
              {isActive && <span className="ml-auto text-xs text-blue-400 animate-pulse">writing...</span>}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-slate-400">Usually completes in 30–60 seconds</p>
    </div>
  );
}

// ─── Tax analysis loader ──────────────────────────────────────────────────────

const TAX_STEPS = ["Reading your receipts", "Scanning bank transactions", "Identifying deduction gaps", "Comparing to industry benchmarks", "Computing potential savings", "Building recommendations"];

export function TaxLoader({ progress }: { progress?: number }) {
  const [step, setStep] = useState(0);
  const [doneSteps, setDoneSteps] = useState<number[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      setDoneSteps((p) => [...p, step]);
      setStep((p) => Math.min(p + 1, TAX_STEPS.length - 1));
    }, 2500);
    return () => clearInterval(id);
  }, [step]);

  return (
    <div className="py-10 text-center space-y-5">
      {/* Animated coins */}
      <div className="relative w-16 h-16 mx-auto">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 animate-float">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
          <span className="text-white text-xs font-bold">$</span>
        </div>
      </div>

      <div>
        <p className="font-semibold text-slate-800">Scanning for tax savings</p>
        <p className="text-xs text-slate-400 mt-0.5">AI analyzes your actual receipts and transactions</p>
      </div>

      <ul className="space-y-1.5 text-left max-w-xs mx-auto">
        {TAX_STEPS.map((s, i) => {
          const isDone = doneSteps.includes(i);
          const isActive = step === i && !isDone;
          return (
            <li key={s} className={`flex items-center gap-2.5 text-xs transition-all duration-400 ${isActive ? "opacity-100" : isDone ? "opacity-50" : "opacity-25"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${isDone ? "bg-green-500" : isActive ? "bg-amber-400 animate-pulse" : "bg-slate-200"}`}>
                {isDone ? (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : isActive ? <span className="w-1.5 h-1.5 bg-white rounded-full" /> : null}
              </span>
              <span className={isActive ? "text-slate-800 font-medium" : "text-slate-500"}>{s}</span>
            </li>
          );
        })}
      </ul>

      {progress !== undefined && (
        <div className="max-w-xs mx-auto">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

export function SkeletonLine({ width = "100%", height = "h-3" }: { width?: string; height?: string }) {
  return <div className={`${height} rounded-full animate-skeleton`} style={{ width }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
      <SkeletonLine width="60%" height="h-4" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLine key={i} width={`${70 + Math.random() * 25}%`} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg animate-skeleton flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonLine width="45%" height="h-3.5" />
            <SkeletonLine width="70%" />
          </div>
          <SkeletonLine width="60px" height="h-3.5" />
        </div>
      ))}
    </div>
  );
}
