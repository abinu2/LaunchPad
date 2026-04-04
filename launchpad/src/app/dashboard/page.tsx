"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/context/BusinessContext";
import {
  getContracts, getComplianceItems, getQuotes, getReceipts,
  getFundingOpportunities, getGrowthActions,
} from "@/services/business-graph";
import { AILoadingScreen } from "@/components/ui/LoadingScreen";
import { BusinessHealthScore } from "@/components/dashboard/BusinessHealthScore";
import { RevenuePipeline } from "@/components/dashboard/RevenuePipeline";
import { TodaysPriorities } from "@/components/dashboard/TodaysPriorities";
import { GettingStartedChecklist } from "@/components/dashboard/GettingStartedChecklist";
import { ProtectionQuadrant } from "@/components/dashboard/ProtectionQuadrant";
import { ComplianceQuadrant } from "@/components/dashboard/ComplianceQuadrant";
import { FinancesQuadrant } from "@/components/dashboard/FinancesQuadrant";
import { GrowthQuadrant } from "@/components/dashboard/GrowthQuadrant";
import type { Contract } from "@/types/contract";
import type { ComplianceItem, FundingOpportunity } from "@/types/compliance";
import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";
import type { GrowthAction } from "@/services/business-graph";

// Disable static prerendering for this page
export const dynamic = "force-dynamic";

export type DashboardData = {
  contracts: Contract[];
  complianceItems: ComplianceItem[];
  quotes: Quote[];
  receipts: Receipt[];
  opportunities: FundingOpportunity[];
  growthActions: GrowthAction[];
};

export default function DashboardPage() {
  const { business } = useBusiness();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business?.id) return;
    const load = async () => {
      try {
        const [contracts, complianceItems, quotes, receipts, opportunities, growthActions] = await Promise.all([
          getContracts(business.id),
          getComplianceItems(business.id),
          getQuotes(business.id),
          getReceipts(business.id),
          getFundingOpportunities(business.id),
          getGrowthActions(business.id),
        ]);
        setData({ contracts, complianceItems, quotes, receipts, opportunities, growthActions });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [business?.id]);

  if (loading) {
    return (
      <AILoadingScreen
        title="Loading your dashboard"
        steps={[
          "Fetching contracts and obligations",
          "Checking compliance status",
          "Loading financial data",
          "Scanning growth opportunities",
        ]}
        variant="inline"
      />
    );
  }

  if (!data || !business) return null;

  return (
    <div className="space-y-5">
      {/* Command Center — health score + pipeline side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BusinessHealthScore data={data} business={business} />
        <RevenuePipeline quotes={data.quotes} />
      </div>

      {/* Today's Priorities — cross-feature action list */}
      <TodaysPriorities data={data} business={business} />

      {/* Getting Started Checklist — hides when all tasks are done */}
      <GettingStartedChecklist data={data} business={business} />

      {/* 2×2 Quadrant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/dashboard/protection" className="block group">
          <ProtectionQuadrant contracts={data.contracts} />
        </Link>
        <Link href="/dashboard/compliance" className="block group">
          <ComplianceQuadrant items={data.complianceItems} />
        </Link>
        <Link href="/dashboard/finances" className="block group">
          <FinancesQuadrant quotes={data.quotes} receipts={data.receipts} business={business} />
        </Link>
        <Link href="/dashboard/growth" className="block group">
          <GrowthQuadrant
            business={business}
            quotes={data.quotes}
            opportunities={data.opportunities}
            actions={data.growthActions}
          />
        </Link>
      </div>
    </div>
  );
}
