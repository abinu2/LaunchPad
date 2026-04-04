/**
 * Business Intelligence Graph — client-side service layer.
 * All data access goes through Next.js API routes (no direct DB access from browser).
 * Mirrors the app domain model while the server persists through Prisma.
 */
import type { BusinessProfile } from "@/types/business";
import type { Contract, ContractObligation } from "@/types/contract";
import type { Receipt } from "@/types/financial";
import type { Quote } from "@/types/quote";
import type { ComplianceItem, FundingOpportunity } from "@/types/compliance";
import type { PlaidTransaction, PlaidAccount } from "@/types/plaid";

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `API error ${res.status}`);
  }
  return res.json();
}

// ─── Business ────────────────────────────────────────────────────────────────

export async function createBusiness(
  userId: string,
  data: Omit<BusinessProfile, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const result = await api<{ id: string }>("/api/data/businesses", {
    method: "POST",
    body: JSON.stringify({ userId, ...data }),
  });
  return result.id;
}

export async function getBusiness(businessId: string): Promise<BusinessProfile | null> {
  return api<BusinessProfile | null>(`/api/data/businesses/${businessId}`);
}

export async function updateBusiness(businessId: string, data: Partial<BusinessProfile>): Promise<void> {
  await api(`/api/data/businesses/${businessId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function getBusinessByUserId(userId: string): Promise<BusinessProfile | null> {
  return api<BusinessProfile | null>(`/api/data/businesses?userId=${encodeURIComponent(userId)}`);
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export async function addContract(businessId: string, contract: Omit<Contract, "id">): Promise<string> {
  const result = await api<{ id: string }>(`/api/data/businesses/${businessId}/contracts`, {
    method: "POST",
    body: JSON.stringify(contract),
  });
  return result.id;
}

export async function getContracts(businessId: string): Promise<Contract[]> {
  return api<Contract[]>(`/api/data/businesses/${businessId}/contracts`);
}

export async function getContract(businessId: string, contractId: string): Promise<Contract | null> {
  return api<Contract | null>(`/api/data/businesses/${businessId}/contracts/${contractId}`);
}

export async function updateContract(businessId: string, contractId: string, data: Partial<Contract>): Promise<void> {
  await api(`/api/data/businesses/${businessId}/contracts/${contractId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function updateContractObligations(businessId: string, contractId: string, obligations: ContractObligation[]): Promise<void> {
  await updateContract(businessId, contractId, { obligations });
}

export async function deleteContract(businessId: string, contractId: string): Promise<void> {
  await api(`/api/data/businesses/${businessId}/contracts/${contractId}`, { method: "DELETE" });
}

// ─── Receipts ────────────────────────────────────────────────────────────────

export async function addReceipt(businessId: string, receipt: Omit<Receipt, "id">): Promise<string> {
  const result = await api<{ id: string }>(`/api/data/businesses/${businessId}/receipts`, {
    method: "POST",
    body: JSON.stringify(receipt),
  });
  return result.id;
}

export async function getReceipts(
  businessId: string,
  filters?: { category?: string; startDate?: string; endDate?: string }
): Promise<Receipt[]> {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  const qs = params.toString();
  return api<Receipt[]>(`/api/data/businesses/${businessId}/receipts${qs ? `?${qs}` : ""}`);
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export async function addComplianceItem(businessId: string, item: Omit<ComplianceItem, "id">): Promise<string> {
  const result = await api<{ id: string }>(`/api/data/businesses/${businessId}/compliance`, {
    method: "POST",
    body: JSON.stringify(item),
  });
  return result.id;
}

export async function getComplianceItems(businessId: string): Promise<ComplianceItem[]> {
  return api<ComplianceItem[]>(`/api/data/businesses/${businessId}/compliance`);
}

export async function updateComplianceItem(businessId: string, itemId: string, data: Partial<ComplianceItem>): Promise<void> {
  await api(`/api/data/businesses/${businessId}/compliance/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

export async function addQuote(businessId: string, quote: Omit<Quote, "id">): Promise<string> {
  const result = await api<{ id: string }>(`/api/data/businesses/${businessId}/quotes`, {
    method: "POST",
    body: JSON.stringify(quote),
  });
  return result.id;
}

export async function getQuotes(businessId: string, statusFilter?: string): Promise<Quote[]> {
  const qs = statusFilter ? `?status=${statusFilter}` : "";
  return api<Quote[]>(`/api/data/businesses/${businessId}/quotes${qs}`);
}

export async function updateQuote(businessId: string, quoteId: string, data: Partial<Quote>): Promise<void> {
  await api(`/api/data/businesses/${businessId}/quotes/${quoteId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Funding ─────────────────────────────────────────────────────────────────

export async function addFundingOpportunity(businessId: string, opportunity: Omit<FundingOpportunity, "id">): Promise<string> {
  const result = await api<{ id: string }>(`/api/data/businesses/${businessId}/funding`, {
    method: "POST",
    body: JSON.stringify(opportunity),
  });
  return result.id;
}

export async function getFundingOpportunities(businessId: string): Promise<FundingOpportunity[]> {
  return api<FundingOpportunity[]>(`/api/data/businesses/${businessId}/funding`);
}

export async function updateFundingOpportunity(businessId: string, opportunityId: string, data: Partial<FundingOpportunity>): Promise<void> {
  await api(`/api/data/businesses/${businessId}/funding/${opportunityId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ─── Bank / Plaid ─────────────────────────────────────────────────────────────

export async function getBankTransactions(
  businessId: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<PlaidTransaction[]> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  const qs = params.toString();
  return api<PlaidTransaction[]>(`/api/data/businesses/${businessId}/bank-transactions${qs ? `?${qs}` : ""}`);
}

export async function getPlaidConnections(businessId: string): Promise<{
  itemId: string; institutionName: string; accounts: PlaidAccount[];
  lastSyncedAt: string | null; status: string;
}[]> {
  return api(`/api/data/businesses/${businessId}/plaid-connections`);
}

// ─── Growth Actions ───────────────────────────────────────────────────────────

export interface GrowthAction {
  id: string;
  type: "pricing" | "expense" | "milestone";
  title: string;
  impact: string;
  reasoning: string;
  urgency: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  dismissed: boolean;
}

export async function getGrowthActions(businessId: string): Promise<GrowthAction[]> {
  return api<GrowthAction[]>(`/api/data/businesses/${businessId}/growth-actions`);
}

export async function dismissGrowthAction(businessId: string, actionId: string): Promise<void> {
  await api(`/api/data/businesses/${businessId}/growth-actions/${actionId}`, {
    method: "PATCH",
    body: JSON.stringify({ dismissed: true }),
  });
}
