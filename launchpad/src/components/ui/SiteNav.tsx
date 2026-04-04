"use client";

import Link from "next/link";
import { useBusiness } from "@/context/BusinessContext";

/**
 * Minimal sticky nav for pages outside the dashboard layout.
 * Provides a consistent home logo + link back to /dashboard on every page.
 */
export function SiteNav() {
  const { business } = useBusiness();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo → home */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">
            {business?.businessName ?? "Launchpad"}
          </span>
        </Link>

        {/* Back to dashboard */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </Link>
      </div>
    </header>
  );
}
