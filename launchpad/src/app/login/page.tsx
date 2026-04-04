"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/auth/login";
    }
  }, [user, loading]);

  return (
    <LoadingScreen
      title="Signing you in"
      subtitle="Redirecting to secure authentication"
      steps={[
        "Connecting to Auth0",
        "Verifying credentials",
        "Loading your workspace",
      ]}
    />
  );
}
