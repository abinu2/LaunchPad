/**
 * POST /api/plaid/exchange-token
 * Exchanges Plaid Link public token for access token and stores connection.
 * Uses upsert on itemId so re-connecting the same bank doesn't create duplicates.
 * Also marks the business as having a bank connected (completedSteps).
 */
import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, publicToken, institutionId: clientInstitutionId, institutionName: clientInstitutionName } = body as {
      businessId?: string;
      publicToken?: string;
      institutionId?: string;
      institutionName?: string;
    };

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

    // Use institution info from client metadata (faster, avoids extra API call).
    // Fall back to fetching from Plaid if not provided.
    let institutionId = clientInstitutionId ?? "";
    let institutionName = clientInstitutionName ?? "Bank";

    if (!institutionId) {
      try {
        const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
        institutionId = itemResponse.data.item.institution_id ?? "";
        if (institutionId) {
          const instResponse = await plaidClient.institutionsGetById({
            institution_id: institutionId,
            country_codes: ["US" as any],
          });
          institutionName = instResponse.data.institution.name;
        }
      } catch (err) {
        console.warn("Could not fetch institution details:", err);
      }
    }

    // Upsert so re-connecting the same bank updates the token instead of duplicating
    const connection = await prisma.plaidConnection.upsert({
      where: { itemId },
      update: {
        accessToken,
        institutionId,
        institutionName,
        status: "active",
        errorCode: null,
        lastSyncedAt: null,
      },
      create: {
        businessId,
        itemId,
        accessToken,
        institutionId,
        institutionName,
        status: "active",
      },
    });

    // Mark bank as connected in the business's completedSteps so it persists
    const biz = await prisma.business.findUnique({
      where: { id: businessId },
      select: { completedSteps: true },
    });
    const steps = (biz?.completedSteps as string[] | null) ?? [];
    if (!steps.includes("bank_connected")) {
      await prisma.business.update({
        where: { id: businessId },
        data: { completedSteps: [...steps, "bank_connected"] },
      });
    }

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
