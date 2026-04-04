import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeContract } from "@/lib/serializers";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ businessId: string; contractId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId, contractId } = await params;
    await requireBusinessAccess(businessId);
    const row = await prisma.contract.findFirst({ where: { id: contractId, businessId } });
    return NextResponse.json(row ? serializeContract(row) : null);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { businessId, contractId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const { id: _id, businessId: _bid, createdAt: _c, updatedAt: _u, uploadedAt: _ua, ...update } = data;
    await prisma.contract.updateMany({ where: { id: contractId, businessId }, data: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { businessId, contractId } = await params;
    await requireBusinessAccess(businessId);
    await prisma.contract.deleteMany({ where: { id: contractId, businessId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
