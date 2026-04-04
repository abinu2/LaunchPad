import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ businessId: string; quoteId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { businessId, quoteId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const { id: _id, businessId: _bid, createdAt: _c, updatedAt: _u, ...update } = data;
    for (const f of ["sentAt", "viewedAt", "acceptedAt", "paidAt", "lastFollowUpAt", "nextFollowUpAt", "contractSignedAt"]) {
      if (update[f] && typeof update[f] === "string") update[f] = new Date(update[f]);
      if (update[f] === null) update[f] = null;
    }
    await prisma.quote.updateMany({ where: { id: quoteId, businessId }, data: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
