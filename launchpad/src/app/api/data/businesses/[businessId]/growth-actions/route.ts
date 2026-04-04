import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeGrowthAction } from "@/lib/serializers";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const docs = await prisma.growthAction.findMany({
      where: { businessId, dismissed: false },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(docs.map(serializeGrowthAction));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
