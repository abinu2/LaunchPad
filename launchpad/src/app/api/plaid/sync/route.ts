import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    await requireBusinessAccess(businessId);

    const connections = await prisma.plaidConnection.findMany({
      where: { businessId, status: "active" },
    });

    if (connections.length === 0) {
      return NextResponse.json({ error: "No connected bank accounts" }, { status: 404 });
    }

    const allAccounts: ReturnType<typeof mapAccount>[] = [];
    const allTransactions: ReturnType<typeof mapTransaction>[] = [];

    for (const conn of connections) {
      try {
        const accountsRes = await plaidClient.accountsGet({ access_token: conn.accessToken });
        const accounts = accountsRes.data.accounts.map(mapAccount);
        allAccounts.push(...accounts);

        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
        const txRes = await plaidClient.transactionsGet({
          access_token: conn.accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: 500, offset: 0 },
        });
        allTransactions.push(...txRes.data.transactions.map(mapTransaction));

        await prisma.plaidConnection.update({
          where: { id: conn.id },
          data: {
            accounts,
            lastSyncedAt: new Date(),
            status: "active",
            errorCode: null,
          },
        });
      } catch (itemErr: unknown) {
        const errCode = (itemErr as { response?: { data?: { error_code?: string } } })?.response?.data?.error_code;
        await prisma.plaidConnection.update({
          where: { id: conn.id },
          data: { status: "error", errorCode: errCode ?? "UNKNOWN" },
        });
      }
    }

    const income = allTransactions.filter((t) => !t.pending && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const expenses = allTransactions.filter((t) => !t.pending && t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const currentBalance = allAccounts.filter((a) => a.type === "depository").reduce((s, a) => s + (a.balances.current ?? 0), 0);

    await prisma.business.update({
      where: { id: businessId },
      data: {
        currentCashBalance: currentBalance,
        financialsUpdatedAt: new Date(),
      },
    });

    for (const tx of allTransactions.slice(0, 200)) {
      await prisma.bankTransaction.upsert({
        where: { transactionId: tx.transaction_id },
        update: {
          businessId,
          accountId: tx.account_id,
          amount: tx.amount,
          date: tx.date,
          name: tx.name,
          merchantName: tx.merchant_name ?? null,
          category: tx.category ?? [],
          pending: tx.pending,
          paymentChannel: tx.payment_channel,
          personalFinanceCategory: tx.personal_finance_category ?? undefined,
        },
        create: {
          businessId,
          transactionId: tx.transaction_id,
          accountId: tx.account_id,
          amount: tx.amount,
          date: tx.date,
          name: tx.name,
          merchantName: tx.merchant_name ?? null,
          category: tx.category ?? [],
          pending: tx.pending,
          paymentChannel: tx.payment_channel,
          personalFinanceCategory: tx.personal_finance_category ?? undefined,
        },
      });
    }

    return NextResponse.json({
      accounts: allAccounts,
      transactionCount: allTransactions.length,
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      currentBalance: Math.round(currentBalance * 100) / 100,
      syncedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Plaid sync error:", err);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

function mapAccount(a: {
  account_id: string; name: string; official_name?: string | null;
  type: string; subtype?: string | null; mask?: string | null;
  balances: { available?: number | null; current?: number | null; limit?: number | null; iso_currency_code?: string | null };
}) {
  return {
    account_id: a.account_id, name: a.name, official_name: a.official_name ?? null,
    type: a.type, subtype: a.subtype ?? null, mask: a.mask ?? null,
    balances: { available: a.balances.available ?? null, current: a.balances.current ?? null, limit: a.balances.limit ?? null, iso_currency_code: a.balances.iso_currency_code ?? null },
  };
}

function mapTransaction(t: {
  transaction_id: string; account_id: string; amount: number; date: string;
  name: string; merchant_name?: string | null; category?: string[] | null;
  pending: boolean; payment_channel: string;
  personal_finance_category?: { primary: string; detailed: string } | null;
}) {
  return {
    transaction_id: t.transaction_id, account_id: t.account_id, amount: t.amount,
    date: t.date, name: t.name, merchant_name: t.merchant_name ?? null,
    category: t.category ?? [], pending: t.pending, payment_channel: t.payment_channel,
    personal_finance_category: t.personal_finance_category ?? null,
  };
}
