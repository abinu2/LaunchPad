import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ businessId: string; itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { businessId, itemId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const { id: _id, businessId: _bid, createdAt: _c, updatedAt: _u, ...update } = data;
    await prisma.complianceItem.updateMany({
      where: { id: itemId, businessId },
      data: { ...update, lastCheckedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { businessId, itemId } = await params;
    await requireBusinessAccess(businessId);
    await prisma.complianceItem.deleteMany({ where: { id: itemId, businessId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
