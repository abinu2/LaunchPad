"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBusiness } from "@/context/BusinessContext";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function RootPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) {
      router.replace("/login");
    } else if (!business) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [user, business, authLoading, bizLoading, router]);

  return (
    <LoadingScreen
      title="Starting Launchpad"
      subtitle="Getting everything ready for you"
      steps={["Verifying your session", "Loading your business", "Preparing dashboard"]}
    />
  );
}
