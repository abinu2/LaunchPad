"use client";

import { useEffect, useMemo, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Shield,
  FileSignature,
  TrendingUp,
  DollarSign,
  GraduationCap,
  ShieldCheck,
  Settings,
} from "lucide-react";
import { NavigationItem, NavItem } from "./NavigationItem";
import type { BusinessProfile } from "@/types/business";

const animationTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const };

function getInitials(name?: string | null): string {
  if (!name) return "LP";
  return name.split(" ").slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

function formatRevenue(n?: number | null): string {
  if (!n) return "$0/mo";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M/mo`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K/mo`;
  return `$${n}/mo`;
}

interface Props {
  activeTab: string;
  business: BusinessProfile;
  isExpanded: boolean;
  isMobileOpen: boolean;
  viewportMode: "desktop" | "mobile";
  onNavigate: (tab: string) => void;
  onHoverExpandedChange?: (expanded: boolean) => void;
  onMobileClose?: () => void;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard",   label: "Dashboard",   icon: BarChart3,    section: "main" },
  { id: "protection",  label: "Protection",  icon: Shield,       section: "main" },
  { id: "compliance",  label: "Compliance",  icon: ShieldCheck,  section: "main" },
  { id: "finances",    label: "Finances",    icon: DollarSign,   section: "main" },
  { id: "taxes",       label: "Taxes",       icon: DollarSign,   section: "main" },
  { id: "growth",      label: "Growth",      icon: TrendingUp,   section: "main" },
  { id: "contracts",   label: "Documents",   icon: FileSignature, section: "main" },
  { id: "learn",       label: "Learn",       icon: GraduationCap, section: "main" },
  { id: "settings",    label: "Settings",    icon: Settings,     section: "footer", disabled: true },
];

export function CollapsibleSidebar({
  activeTab,
  business,
  isExpanded,
  isMobileOpen,
  viewportMode,
  onNavigate,
  onHoverExpandedChange,
  onMobileClose,
}: Props) {
  const drawerRef = useRef<HTMLElement>(null);
  const showExpanded = viewportMode === "mobile" ? true : isExpanded;
  const sidebarWidth = showExpanded ? 280 : 64;

  const mainItems  = useMemo(() => NAV_ITEMS.filter((i) => i.section === "main"), []);
  const footerItems = useMemo(() => NAV_ITEMS.filter((i) => i.section === "footer"), []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.toggle("sidebar-open", viewportMode === "mobile" && isMobileOpen);
    return () => document.body.classList.remove("sidebar-open");
  }, [viewportMode, isMobileOpen]);

  const sidebarContent = (
    <motion.aside
      id="primary-navigation"
      ref={drawerRef}
      role="navigation"
      aria-label="Main navigation"
      aria-expanded={showExpanded}
      onMouseEnter={() => onHoverExpandedChange?.(true)}
      onMouseLeave={() => onHoverExpandedChange?.(false)}
      animate={
        viewportMode === "mobile"
          ? { x: 0 }
          : { width: sidebarWidth }
      }
      initial={viewportMode === "mobile" ? { x: -280 } : false}
      exit={viewportMode === "mobile" ? { x: -280 } : undefined}
      transition={animationTransition}
      className={`sidebar-shell fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-white/10 backdrop-blur-xl ${viewportMode === "mobile" ? "shadow-2xl" : ""}`}
      style={{ width: viewportMode === "mobile" ? 280 : sidebarWidth }}
    >
      {/* Logo */}
      <div className={`flex h-[88px] items-center border-b border-white/10 ${showExpanded ? "justify-between px-5" : "justify-center px-2"}`}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045] text-[--color-primary] shadow-[0_10px_24px_rgba(0,0,0,0.2)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <AnimatePresence initial={false}>
            {showExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <p className="text-lg font-normal tracking-[-0.02em] text-[--color-text-primary]">LaunchPad</p>
                <p className="text-[11px] font-light uppercase tracking-[0.05em] text-[--color-text-secondary]">Business advisor</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`flex-1 overflow-y-auto py-4 ${showExpanded ? "px-3" : "px-2"}`}>
          <div className="space-y-1">
            {mainItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <NavigationItem
                  item={item}
                  isActive={activeTab === item.id}
                  isExpanded={showExpanded}
                  onClick={() => onNavigate(item.id)}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer: business info + settings */}
        <div className={`border-t border-white/[0.08] py-4 ${showExpanded ? "px-3" : "px-2"}`}>
          {/* Business info pill */}
          <div className="sidebar-panel mb-3 rounded-2xl p-3">
            <AnimatePresence initial={false} mode="wait">
              {showExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-3"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-xs font-medium text-[--color-primary]">
                    {getInitials(business.businessName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium tracking-[-0.01em] text-[--color-text-primary]">{business.businessName}</p>
                    <p className="mt-0.5 text-xs font-light text-[--color-text-secondary]">
                      {formatRevenue(business.financials?.monthlyRevenueAvg)}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.045] text-xs font-medium text-[--color-primary]">
                    {getInitials(business.businessName)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer nav items (settings etc.) */}
          <div className="space-y-1">
            {footerItems.map((item) => (
              <NavigationItem
                key={item.id}
                item={item}
                isActive={false}
                isExpanded={showExpanded}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.aside>
  );

  if (viewportMode === "mobile") {
    return (
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.button
              key="backdrop"
              type="button"
              aria-label="Close navigation drawer"
              className="sidebar-backdrop fixed inset-0 z-30 border-0 bg-transparent p-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={animationTransition}
              onClick={onMobileClose}
            />
            {sidebarContent}
          </>
        )}
      </AnimatePresence>
    );
  }

  return sidebarContent;
}
