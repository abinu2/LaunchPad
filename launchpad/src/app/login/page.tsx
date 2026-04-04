"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode"); // "signup" | null

  // Already logged in — go to dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Not logged in — redirect to Auth0
  useEffect(() => {
    if (loading || user) return;

    // Auth0 v4: /auth/login supports ?screen_hint=signup for new users
    const url = mode === "signup"
      ? "/auth/login?screen_hint=signup"
      : "/auth/login";

    window.location.href = url;
  }, [user, loading, mode]);

  return (
    <LoadingScreen
      title={mode === "signup" ? "Creating your account" : "Signing you in"}
      subtitle="Redirecting to secure authentication"
      steps={[
        "Connecting to Auth0",
        mode === "signup" ? "Setting up your account" : "Verifying credentials",
        "Loading your workspace",
      ]}
    />
  );
}
