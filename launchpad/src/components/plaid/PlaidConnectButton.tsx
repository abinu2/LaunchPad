"use client";

import { useState, useCallback, useEffect } from "react";
import { usePlaidLink } from "react-plaid-link";

interface Props {
  businessId: string;
  onSuccess: () => void;
  className?: string;
  children?: React.ReactNode;
}

export function PlaidConnectButton({ businessId, onSuccess, className, children }: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Failed to create link token");
      setLinkToken(data.link_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect bank");
      setLoading(false);
    }
  };

  const handleSuccess = useCallback(
    async (
      publicToken: string,
      metadata: { institution?: { institution_id: string; name: string } | null }
    ) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicToken,
            businessId,
            institutionId: metadata.institution?.institution_id ?? "",
            institutionName: metadata.institution?.name ?? "Bank",
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "Failed to connect bank");
        onSuccess();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to connect bank");
      } finally {
        setLoading(false);
        setLinkToken(null);
      }
    },
    [businessId, onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken ?? "",
    onSuccess: handleSuccess,
    onExit: () => {
      setLinkToken(null);
      setLoading(false);
    },
  });

  // Auto-open Link once we have a token and Plaid is ready
  useEffect(() => {
    if (linkToken && ready) {
      open();
    }
  }, [linkToken, ready, open]);

  return (
    <div>
      <button
        onClick={fetchLinkToken}
        disabled={loading}
        className={
          className ??
          "flex items-center gap-2 px-4 py-2 bg-[#00CF31] text-black font-semibold hover:bg-[#00b82c] disabled:opacity-50 transition-colors"
        }
      >
        {loading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )}
        {children ?? (loading ? "Connecting..." : "Connect bank account")}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}
