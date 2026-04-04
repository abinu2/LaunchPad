"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import type { BusinessProfile } from "@/types/business";

interface Props {
  business: BusinessProfile;
}

export function DashboardNav({ business }: Props) {
  const { signOut } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + business name */}
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="font-semibold text-slate-900 text-sm truncate max-w-[160px]">
            {business.businessName}
          </span>
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { href: "/dashboard/protection", label: "Protection" },
            { href: "/dashboard/compliance", label: "Compliance" },
            { href: "/dashboard/finances", label: "Finances" },
            { href: "/dashboard/growth", label: "Growth" },
            { href: "/contracts", label: "Contracts" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <QuickActionsMenu />
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold flex items-center justify-center"
            >
              {business.ownerName?.[0]?.toUpperCase() ?? "U"}
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                <p className="px-3 py-2 text-xs text-slate-400 truncate">{business.ownerEmail}</p>
                <hr className="border-slate-100" />
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function QuickActionsMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const actions = [
    { label: "New Quote", icon: "📄", href: "/quotes" },
    { label: "Scan Receipt", icon: "📷", href: "/receipts" },
    { label: "Upload Contract", icon: "📋", href: "/contracts" },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 h-8 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        <span className="hidden sm:inline">New</span>
      </button>
      {open && (
        <div className="absolute right-0 top-10 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
          {actions.map((a) => (
            <button
              key={a.href}
              onClick={() => { setOpen(false); router.push(a.href); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
