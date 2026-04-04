import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeBusiness } from "@/lib/serializers";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    return NextResponse.json(biz ? serializeBusiness(biz) : null);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();

    const update: Record<string, unknown> = { ...data };
    if (data.financials) {
      Object.assign(update, {
        monthlyRevenueAvg: data.financials.monthlyRevenueAvg,
        monthlyExpenseAvg: data.financials.monthlyExpenseAvg,
        profitMargin: data.financials.profitMargin,
        totalRevenueYTD: data.financials.totalRevenueYTD,
        totalExpensesYTD: data.financials.totalExpensesYTD,
        currentCashBalance: data.financials.currentCashBalance,
        financialsUpdatedAt: new Date(),
      });
      delete update.financials;
    }

    delete update.id;
    delete update.auth0Id;
    delete update.userId;
    delete update.createdAt;
    delete update.updatedAt;

    await prisma.business.update({ where: { id: businessId }, data: update });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
