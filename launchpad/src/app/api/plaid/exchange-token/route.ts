/**
 * POST /api/plaid/exchange-token
 * Exchanges Plaid Link public token for access token and stores connection
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { businessId, publicToken } = await req.json();
    if (!businessId || !publicToken) {
      return NextResponse.json({ error: "businessId and publicToken required" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get institution info
    const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
    const institutionId = itemResponse.data.item.institution_id;

    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"],
    });
    const institutionName = institutionResponse.data.institution.name;

    // Store connection in database
    const connection = await prisma.plaidConnection.create({
      data: {
        businessId,
        itemId,
        accessToken,
        institutionId,
        institutionName,
        status: "active",
      },
    });

    return NextResponse.json({
      success: true,
      connectionId: connection.id,
      institutionName,
    });
  } catch (err) {
    console.error("exchange-token error:", err);
    return NextResponse.json({ error: "Failed to exchange token" }, { status: 500 });
  }
}
