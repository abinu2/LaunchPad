"use client";

import { ChevronLeft, Menu } from "lucide-react";
import { motion } from "framer-motion";
import type { BusinessProfile } from "@/types/business";

function getInitials(name?: string | null): string {
  if (!name) return "LP";
  return name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

interface Props {
  activeLabel: string;
  business: BusinessProfile;
  userName?: string | null;
  userEmail?: string | null;
  logoutUrl?: string;
  sidebarOffset: number;
  viewportMode: "desktop" | "mobile";
  isSidebarExpanded: boolean;
  isMobileOpen: boolean;
  onMenuToggle: () => void;
}

export function TopBar({
  activeLabel,
  business,
  userName,
  userEmail,
  logoutUrl,
  sidebarOffset,
  viewportMode,
  isSidebarExpanded,
  isMobileOpen,
  onMenuToggle,
}: Props) {
  const sidebarLabel =
    viewportMode === "mobile"
      ? isMobileOpen ? "Close navigation" : "Open navigation"
      : isSidebarExpanded ? "Collapse sidebar" : "Expand sidebar";

  const subtitle = `${business.businessName ?? "Your Business"} · ${business.entityState ?? ""}`;

  return (
    <motion.header
      animate={{
        left: viewportMode === "mobile" ? 0 : sidebarOffset,
        width: viewportMode === "mobile" ? "100%" : `calc(100% - ${sidebarOffset}px)`,
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="topbar-glass fixed top-0 z-30 h-[88px] border-b border-white/10"
    >
      <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: menu button + title */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            title={sidebarLabel}
            aria-label={sidebarLabel}
            aria-controls="primary-navigation"
            aria-expanded={viewportMode === "mobile" ? isMobileOpen : isSidebarExpanded}
            className="sidebar-action-surface focus-ring-control inline-flex h-11 w-11 items-center justify-center rounded-2xl text-[--color-text-primary] transition-all duration-200 hover:border-[--color-primary]/30 hover:text-[--color-primary]"
          >
            {viewportMode === "mobile" ? (
              <Menu className="h-5 w-5" />
            ) : (
              <motion.div
                animate={{ rotate: isSidebarExpanded ? 0 : 180 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                className="animate-pulse-subtle"
              >
                <ChevronLeft className="h-5 w-5" />
              </motion.div>
            )}
          </button>

          <div className="min-w-0">
            <p className="truncate text-lg font-normal tracking-[-0.02em] text-[--color-text-primary]">
              {activeLabel}
            </p>
            <p className="truncate text-xs font-light uppercase tracking-[0.05em] text-[--color-text-secondary]">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: user avatar + logout */}
        <div className="flex items-center gap-2">
          <div className="sidebar-action-surface flex items-center gap-2 rounded-2xl px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-xs font-medium text-[--color-primary]">
              {getInitials(userName ?? business.ownerName)}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-normal text-[--color-text-primary]">
                {userName ?? business.ownerName ?? "Owner"}
              </p>
              <p className="text-[11px] font-light uppercase tracking-[0.05em] text-[--color-text-secondary]">
                {userEmail ?? "Business owner"}
              </p>
            </div>
          </div>

          {logoutUrl && (
            <a
              href={logoutUrl}
              className="sidebar-action-surface hidden rounded-2xl px-3 py-2 text-sm text-[--color-text-secondary] transition-colors hover:text-[--color-text-primary] sm:inline-flex"
            >
              Logout
            </a>
          )}
        </div>
      </div>
    </motion.header>
  );
}
