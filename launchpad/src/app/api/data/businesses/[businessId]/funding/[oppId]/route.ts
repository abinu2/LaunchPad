import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ businessId: string; oppId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { businessId, oppId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const { id: _id, businessId: _bid, amount, amountMin, amountMax, ...update } = data;
    await prisma.fundingOpportunity.updateMany({
      where: { id: oppId, businessId },
      data: {
        ...update,
        ...(amount ? { amountMin: amount.min ?? 0, amountMax: amount.max ?? 0 } : {}),
        ...(amountMin !== undefined ? { amountMin } : {}),
        ...(amountMax !== undefined ? { amountMax } : {}),
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
