import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeReceipt } from "@/lib/serializers";

type Params = { params: Promise<{ businessId: string; receiptId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { businessId, receiptId } = await params;
    await requireBusinessAccess(businessId);
    const row = await prisma.receipt.findFirst({ where: { id: receiptId, businessId } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(serializeReceipt(row));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { businessId, receiptId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const { id: _id, businessId: _bid, createdAt: _c, ...update } = data;
    await prisma.receipt.updateMany({ where: { id: receiptId, businessId }, data: update });
    // Recalculate business financials snapshot after receipt change
    await recalcFinancials(businessId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { businessId, receiptId } = await params;
    await requireBusinessAccess(businessId);
    await prisma.receipt.deleteMany({ where: { id: receiptId, businessId } });
    await recalcFinancials(businessId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unauthorized" }, { status: 401 });
  }
}

// Recalculate and persist the business financials snapshot
async function recalcFinancials(businessId: string) {
  try {
    const [receipts, quotes] = await Promise.all([
      prisma.receipt.findMany({ where: { businessId } }),
      prisma.quote.findMany({ where: { businessId } }),
    ]);

    const currentYear = new Date().getFullYear().toString();
    const ytdReceipts = receipts.filter((r) => r.date?.startsWith(currentYear));
    const ytdPaidQuotes = quotes.filter(
      (q) => q.status === "paid" && q.paidAt && new Date(q.paidAt).getFullYear() === Number(currentYear)
    );

    const totalExpensesYTD = ytdReceipts.reduce((s, r) => s + (r.deductibleAmount ?? r.amount ?? 0), 0);
    const totalRevenueYTD = ytdPaidQuotes.reduce((s, q) => s + (q.total ?? 0), 0);
    const profitMargin = totalRevenueYTD > 0 ? (totalRevenueYTD - totalExpensesYTD) / totalRevenueYTD : 0;

    // Monthly averages based on months with data
    const monthsWithData = new Set(ytdReceipts.map((r) => r.date?.slice(0, 7))).size || 1;
    const monthlyExpenseAvg = totalExpensesYTD / monthsWithData;
    const monthlyRevenueAvg = totalRevenueYTD / Math.max(monthsWithData, 1);

    await prisma.business.update({
      where: { id: businessId },
      data: {
        totalExpensesYTD,
        totalRevenueYTD,
        profitMargin,
        monthlyExpenseAvg,
        monthlyRevenueAvg,
        financialsUpdatedAt: new Date(),
      },
    });
  } catch {
    // Non-blocking — don't fail the main request if snapshot update fails
  }
}
