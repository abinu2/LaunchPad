"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getBusinessByUserId } from "@/services/business-graph";
import { useAuth } from "@/context/AuthContext";
import type { BusinessProfile } from "@/types/business";

interface BusinessContextValue {
  business: BusinessProfile | null;
  loading: boolean;
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusiness = async () => {
    if (!user) {
      setBusiness(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Auth0 uses user.sub as the unique user identifier
      const b = await getBusinessByUserId(user.sub);
      setBusiness(b);
    } catch (err) {
      console.error("Failed to fetch business:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.sub]);

  return (
    <BusinessContext.Provider value={{ business, loading, refreshBusiness: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusiness must be used within BusinessProvider");
  return ctx;
}
