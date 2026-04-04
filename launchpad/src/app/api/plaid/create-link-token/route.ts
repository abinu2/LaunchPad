/**
 * POST /api/plaid/create-link-token
 * Creates a Plaid Link token for the client to initiate bank connection
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { plaidClient } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    const { businessId } = await req.json();
    if (!businessId) {
      return NextResponse.json({ error: "businessId required" }, { status: 400 });
    }

    await requireBusinessAccess(businessId);

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: businessId },
      client_name: "Launchpad",
      language: "en",
      country_codes: ["US"],
      products: ["auth", "transactions"],
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("create-link-token error:", err);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}
