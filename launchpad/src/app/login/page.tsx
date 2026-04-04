"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  // Redirect to Auth0 Universal Login
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/api/auth/login";
    }
  }, [user, loading]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl">
        <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <Spinner size="lg" />
      <p className="text-slate-500 text-sm">Redirecting to sign in...</p>
    </div>
  );
}
