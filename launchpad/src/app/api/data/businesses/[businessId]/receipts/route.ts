import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeReceipt } from "@/lib/serializers";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const category = req.nextUrl.searchParams.get("category");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");

    const rows = await prisma.receipt.findMany({
      where: {
        businessId,
        ...(category ? { category } : {}),
        ...(startDate || endDate ? { date: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } } : {}),
      },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(rows.map(serializeReceipt));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const row = await prisma.receipt.create({
      data: {
        businessId,
        imageUrl: data.imageUrl ?? "",
        vendor: data.vendor ?? "",
        amount: data.amount ?? 0,
        date: data.date ?? new Date().toISOString().slice(0, 10),
        lineItems: data.lineItems ?? [],
        category: data.category ?? "other",
        taxClassification: data.taxClassification ?? "expense",
        businessPercentage: data.businessPercentage ?? 100,
        deductibleAmount: data.deductibleAmount ?? 0,
        taxNotes: data.taxNotes ?? "",
        isReconciled: data.isReconciled ?? false,
        associatedMileage: data.associatedMileage ?? null,
        needsMoreInfo: data.needsMoreInfo ?? false,
        pendingQuestion: data.pendingQuestion ?? null,
      },
    });
    return NextResponse.json({ id: row.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
