/**
 * POST /api/plaid/create-link-token
 * Creates a Plaid Link token for the client to initiate bank connection
 */
import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { plaidClient } from "@/lib/plaid";

export async function POST(req: NextRequest) {
  try {
    // businessId is optional — we use the session user's sub as the Plaid user ID
    const body = await req.json().catch(() => ({}));
    const { businessId } = body as { businessId?: string };

    const sessionUser = await requireSessionUser();

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: sessionUser.sub },
      client_name: "Launchpad",
      language: "en",
      country_codes: ["US" as any],
      products: ["transactions"] as any,
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("create-link-token error:", err);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}
