import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializePlaidConnection } from "@/lib/serializers";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const docs = await prisma.plaidConnection.findMany({ where: { businessId } });
    return NextResponse.json(docs.map(serializePlaidConnection));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
