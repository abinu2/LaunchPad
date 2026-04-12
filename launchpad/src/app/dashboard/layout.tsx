"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { CollapsibleSidebar } from "@/components/layout/CollapsibleSidebar";
import { TopBar } from "@/components/layout/TopBar";

export const dynamic = "force-dynamic";

// Map URL pathnames to sidebar tab IDs
const PATH_TO_TAB: Record<string, string> = {
  "/dashboard":             "dashboard",
  "/dashboard/protection":  "protection",
  "/dashboard/compliance":  "compliance",
  "/dashboard/finances":    "finances",
  "/dashboard/taxes":       "taxes",
  "/dashboard/growth":      "growth",
  "/contracts":             "contracts",
  "/quotes":                "contracts",
  "/receipts":              "contracts",
};

// Map tab IDs to navigation paths
const TAB_TO_PATH: Record<string, string> = {
  dashboard:  "/dashboard",
  protection: "/dashboard/protection",
  compliance: "/dashboard/compliance",
  finances:   "/dashboard/finances",
  taxes:      "/dashboard/taxes",
  growth:     "/dashboard/growth",
  contracts:  "/contracts",
  learn:      "/dashboard",
};

// Human-readable labels for the top bar
const TAB_LABELS: Record<string, string> = {
  dashboard:  "Overview",
  protection: "Protection",
  compliance: "Compliance",
  finances:   "Finances",
  taxes:      "Tax Analysis",
  growth:     "Growth",
  contracts:  "Documents",
  learn:      "Learn",
};

function useViewportMode(): "desktop" | "mobile" {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    const update = () => setMode(mql.matches ? "mobile" : "desktop");
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return mode;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const router   = useRouter();
  const pathname = usePathname();

  const viewportMode = useViewportMode();

  // Sidebar state
  const [isExpanded,   setIsExpanded]   = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Hover-to-expand (desktop only)
  const handleHoverExpand = useCallback((expanded: boolean) => {
    if (viewportMode === "desktop") setIsExpanded(expanded);
  }, [viewportMode]);

  // Menu toggle (desktop: collapse/expand, mobile: open/close drawer)
  const handleMenuToggle = useCallback(() => {
    if (viewportMode === "mobile") {
      setIsMobileOpen((v) => !v);
    } else {
      setIsExpanded((v) => !v);
    }
  }, [viewportMode]);

  // Close mobile drawer when viewport switches to desktop
  useEffect(() => {
    if (viewportMode === "desktop") setIsMobileOpen(false);
  }, [viewportMode]);

  // Auth guard
  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) router.replace("/login");
    else if (!business) router.replace("/onboarding");
  }, [user, business, authLoading, bizLoading, router]);

  if (authLoading || bizLoading) {
    return (
      <LoadingScreen
        title="Loading your dashboard"
        subtitle="Fetching your business data"
        steps={[
          "Authenticating your session",
          "Loading business profile",
          "Preparing your workspace",
        ]}
      />
    );
  }

  if (!user || !business) return null;

  // Determine active tab from current path
  const activeTab = PATH_TO_TAB[pathname] ?? "dashboard";
  const activeLabel = TAB_LABELS[activeTab] ?? "LaunchPad";

  // Sidebar pixel width (used to offset TopBar + main content)
  const sidebarOffset = viewportMode === "mobile" ? 0 : (isExpanded ? 280 : 64);

  const handleNavigate = (tab: string) => {
    const path = TAB_TO_PATH[tab];
    if (path) router.push(path);
    if (viewportMode === "mobile") setIsMobileOpen(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-primary)" }}>
      {/* Collapsible sidebar */}
      <CollapsibleSidebar
        activeTab={activeTab}
        business={business}
        isExpanded={isExpanded}
        isMobileOpen={isMobileOpen}
        viewportMode={viewportMode}
        onNavigate={handleNavigate}
        onHoverExpandedChange={handleHoverExpand}
        onMobileClose={() => setIsMobileOpen(false)}
      />

      {/* Fixed top bar — offset matches sidebar width */}
      <TopBar
        activeLabel={activeLabel}
        business={business}
        userName={user.name}
        userEmail={user.email}
        logoutUrl="/api/auth/logout"
        sidebarOffset={sidebarOffset}
        viewportMode={viewportMode}
        isSidebarExpanded={isExpanded}
        isMobileOpen={isMobileOpen}
        onMenuToggle={handleMenuToggle}
      />

      {/* Main content area — padded to clear sidebar + topbar */}
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          paddingLeft:  viewportMode === "mobile" ? 0 : sidebarOffset,
          paddingTop:   "88px",
        }}
      >
        <div className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
