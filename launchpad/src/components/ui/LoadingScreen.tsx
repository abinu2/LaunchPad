"use client";

import { useEffect, useState } from "react";

// ─── Animated orb background ─────────────────────────────────────────────────

function OrbField() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Large slow orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-orb-1" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-orb-2" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-violet-400/10 rounded-full blur-3xl animate-orb-3" />
      {/* Small fast particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-particle"
          style={{
            left: `${15 + i * 14}%`,
            top: `${20 + (i % 3) * 25}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${2.5 + i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Pulsing logo mark ────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-8">
      {/* Outer ring pulse */}
      <div className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping-slow" />
      {/* Mid ring */}
      <div className="absolute inset-1 rounded-xl bg-blue-500/10 animate-pulse" />
      {/* Core */}
      <div className="relative z-10 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30">
        <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    </div>
  );
}

// ─── Cycling step list ────────────────────────────────────────────────────────

interface StepListProps {
  steps: string[];
  intervalMs?: number;
}

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
          <li
            key={step}
            className={`flex items-center gap-3 text-sm transition-all duration-500 ${
              isActive ? "opacity-100 translate-x-0" : isDone ? "opacity-50" : "opacity-30"
            }`}
          >
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                isDone
                  ? "bg-green-500"
                  : isActive
                  ? "bg-blue-500 animate-pulse"
                  : "bg-slate-200"
              }`}
            >
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
            <span className={isActive ? "text-slate-800 font-medium" : "text-slate-500"}>
              {step}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Animated progress bar ────────────────────────────────────────────────────

function ProgressBar({ progress }: { progress?: number }) {
  return (
    <div className="mt-6 w-full max-w-xs mx-auto">
      <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
        {progress !== undefined ? (
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        ) : (
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full animate-shimmer" />
        )}
      </div>
      {progress !== undefined && (
        <p className="text-xs text-slate-400 text-right mt-1">{Math.round(progress)}%</p>
      )}
    </div>
  );
}

// ─── Public variants ──────────────────────────────────────────────────────────

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  steps?: string[];
  progress?: number;
  variant?: "fullscreen" | "inline";
}

export function LoadingScreen({
  title = "Loading...",
  subtitle,
  steps,
  progress,
  variant = "fullscreen",
}: LoadingScreenProps) {
  const inner = (
    <div className="relative z-10 text-center px-6">
      <LogoMark />
      <h2 className="text-xl font-bold text-slate-900 animate-fade-in">{title}</h2>
      {subtitle && (
        <p className="mt-2 text-sm text-slate-500 animate-fade-in-delay">{subtitle}</p>
      )}
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

// ─── AI-specific loading screen ───────────────────────────────────────────────

const AI_STEPS = [
  "Connecting to Gemini 2.5 Flash",
  "Reading document structure",
  "Extracting key clauses",
  "Assessing risk levels",
  "Generating recommendations",
  "Finalizing analysis",
];

interface AILoadingProps {
  title?: string;
  steps?: string[];
  progress?: number;
  variant?: "fullscreen" | "inline";
}

export function AILoadingScreen({ title = "AI is thinking...", steps = AI_STEPS, progress, variant = "inline" }: AILoadingProps) {
  return (
    <LoadingScreen
      title={title}
      subtitle="Powered by Gemini 2.5 Flash"
      steps={steps}
      progress={progress}
      variant={variant}
    />
  );
}
