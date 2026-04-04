import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { publicToken, businessId, institutionId, institutionName } = await req.json();
    await requireBusinessAccess(businessId);

    const exchangeRes = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
    const { access_token, item_id } = exchangeRes.data;

    const accountsRes = await plaidClient.accountsGet({ access_token });
    const accounts = accountsRes.data.accounts.map((a) => ({
      account_id: a.account_id,
      name: a.name,
      official_name: a.official_name ?? null,
      type: a.type,
      subtype: a.subtype ?? null,
      mask: a.mask ?? null,
      balances: {
        available: a.balances.available ?? null,
        current: a.balances.current ?? null,
        limit: a.balances.limit ?? null,
        iso_currency_code: a.balances.iso_currency_code ?? null,
      },
    }));

    await prisma.plaidConnection.upsert({
      where: { itemId: item_id },
      update: {
        businessId,
        accessToken: access_token,
        institutionId,
        institutionName,
        accounts,
        status: "active",
        errorCode: null,
        lastSyncedAt: null,
      },
      create: {
        businessId,
        itemId: item_id,
        accessToken: access_token,
        institutionId,
        institutionName,
        accounts,
        status: "active",
        errorCode: null,
        lastSyncedAt: null,
      },
    });

    return NextResponse.json({ success: true, accounts, itemId: item_id });
  } catch (err) {
    console.error("Plaid exchange-token error:", err);
    return NextResponse.json({ error: "Failed to connect bank account" }, { status: 500 });
  }
}
