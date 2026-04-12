"use client";

import Link from "next/link";
import type { DashboardData } from "@/app/dashboard/page";
import type { BusinessProfile } from "@/types/business";

interface Props {
  data: DashboardData;
  business: BusinessProfile;
}

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export function GettingStartedChecklist({ data, business }: Props) {
  const items: ChecklistItem[] = [
    {
      id: "contract",
      label: "Upload your first contract",
      description: "Get a plain-English breakdown of any agreement",
      href: "/contracts",
      done: data.contracts.length > 0,
    },
    {
      id: "receipt",
      label: "Scan a receipt",
      description: "Auto-categorize expenses and flag tax deductions",
      href: "/receipts",
      done: data.receipts.length > 0,
    },
    {
      id: "quote",
      label: "Create a quote",
      description: "Send professional quotes and track your pipeline",
      href: "/quotes",
      done: data.quotes.length > 0,
    },
    {
      id: "compliance",
      label: "Review your compliance items",
      description: "Make sure licenses and permits are on track",
      href: "/dashboard/compliance",
      done: data.complianceItems.some((c) => c.status !== "not_started"),
    },
    {
      id: "bank",
      label: "Connect your bank account",
      description: "Unlock cash flow tracking and smarter tax insights",
      href: "/dashboard/finances",
      done: business.financials.lastUpdated !== null,
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const allDone = completed === items.length;

  if (allDone) return null;

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white text-sm">Getting started</h3>
          <p className="text-xs text-white/40 mt-0.5">
            {completed} of {items.length} complete
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {items.map((item) => (
            <div
              key={item.id}
              className={`w-2 h-2 rounded-full ${item.done ? "bg-[#00CF31]" : "bg-white/15"}`}
            />
          ))}
        </div>
      </div>
      <div className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              item.done
                ? "opacity-60"
                : "hover:bg-white/5"
            }`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              item.done
                ? "border-[#00CF31] bg-[#00CF31]"
                : "border-white/25"
            }`}>
              {item.done && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${item.done ? "text-white/30 line-through" : "text-white"}`}>
                {item.label}
              </p>
              {!item.done && (
                <p className="text-xs text-white/40">{item.description}</p>
              )}
            </div>
            {!item.done && (
              <svg className="w-4 h-4 text-white/25" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
