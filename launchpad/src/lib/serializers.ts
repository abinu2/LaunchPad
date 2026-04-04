import type {
  BankTransaction,
  Business,
  ComplianceItem,
  Contract,
  FundingOpportunity,
  GrowthAction,
  PlaidConnection,
  Quote,
  Receipt,
} from "@prisma/client";

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : value;
}

export function serializeBusiness(business: Business) {
  return {
    ...business,
    createdAt: business.createdAt.toISOString(),
    updatedAt: business.updatedAt.toISOString(),
    userId: business.auth0Id,
    financials: {
      monthlyRevenueAvg: business.monthlyRevenueAvg,
      monthlyExpenseAvg: business.monthlyExpenseAvg,
      profitMargin: business.profitMargin,
      totalRevenueYTD: business.totalRevenueYTD,
      totalExpensesYTD: business.totalExpensesYTD,
      currentCashBalance: business.currentCashBalance,
      lastUpdated: toIso(business.financialsUpdatedAt),
    },
  };
}

export function serializeContract(contract: Contract) {
  return {
    ...contract,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
    uploadedAt: contract.createdAt.toISOString(),
  };
}

export function serializeReceipt(receipt: Receipt) {
  return {
    ...receipt,
    createdAt: receipt.createdAt.toISOString(),
    uploadedAt: receipt.createdAt.toISOString(),
  };
}

export function serializeQuote(quote: Quote) {
  return {
    ...quote,
    createdAt: quote.createdAt.toISOString(),
    updatedAt: quote.updatedAt.toISOString(),
    sentAt: toIso(quote.sentAt),
    viewedAt: toIso(quote.viewedAt),
    acceptedAt: toIso(quote.acceptedAt),
    paidAt: toIso(quote.paidAt),
    contractSignedAt: toIso(quote.contractSignedAt),
    lastFollowUpAt: toIso(quote.lastFollowUpAt),
    nextFollowUpAt: toIso(quote.nextFollowUpAt),
  };
}

export function serializeComplianceItem(item: ComplianceItem) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    lastCheckedAt: item.lastCheckedAt.toISOString(),
  };
}

export function serializeFundingOpportunity(item: FundingOpportunity) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    discoveredAt: item.createdAt.toISOString(),
    amount: {
      min: item.amountMin,
      max: item.amountMax,
    },
  };
}

export function serializeGrowthAction(item: GrowthAction) {
  return {
    ...item,
    createdAt: item.createdAt.toISOString(),
  };
}

export function serializeBankTransaction(item: BankTransaction) {
  return {
    ...item,
    transaction_id: item.transactionId,
    account_id: item.accountId,
    merchant_name: item.merchantName,
    payment_channel: item.paymentChannel,
    personal_finance_category: item.personalFinanceCategory,
  };
}

export function serializePlaidConnection(item: PlaidConnection) {
  return {
    id: item.id,
    businessId: item.businessId,
    itemId: item.itemId,
    institutionId: item.institutionId,
    institutionName: item.institutionName,
    connectedAt: item.createdAt.toISOString(),
    lastSyncedAt: toIso(item.lastSyncedAt),
    accounts: item.accounts,
    status: item.status,
    errorCode: item.errorCode,
  };
}
