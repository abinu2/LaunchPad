import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/api-auth";
import { plaidClient, PLAID_PRODUCTS, PLAID_COUNTRY_CODES } from "@/lib/plaid";

export async function POST(_req: NextRequest) {
  try {
    const user = await requireSessionUser();

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.sub },
      client_name: "Launchpad",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error("Plaid create-link-token error:", err);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}
