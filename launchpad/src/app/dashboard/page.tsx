"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/context/BusinessContext";
import {
  getContracts, getComplianceItems, getQuotes, getReceipts,
  getFundingOpportunities, getGrowthActions,
} from "@/services/business-graph";
import { Spinner } from "@/components/ui/Spinner";
import { AIInsightBanner } from "@/components/dashboard/AIInsightBanner";
import { ProtectionQuadrant } from "@/components/dashboard/ProtectionQuadrant";
import { ComplianceQuadrant } from "@/components/dashboard/ComplianceQuadrant";
import { FinancesQuadrant } from "@/components/dashboard/FinancesQuadrant";
import { GrowthQuadrant } from "@/components/dashboard/GrowthQuadrant";
import type { Contract } from "@/types/contract";
import type { ComplianceItem, FundingOpportunity } from "@/types/compliance";
import type { Quote } from "@/types/quote";
import type { Receipt } from "@/types/financial";
import type { GrowthAction } from "@/services/business-graph";

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
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data || !business) return null;

  return (
    <div className="space-y-5">
      {/* AI Insight Banner */}
      <AIInsightBanner data={data} business={business} />

      {/* 2x2 Quadrant Grid */}
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
