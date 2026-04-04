"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { Spinner } from "@/components/ui/Spinner";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) router.replace("/login");
    else if (!business) router.replace("/onboarding");
  }, [user, business, authLoading, bizLoading, router]);

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || !business) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNav business={business} />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
