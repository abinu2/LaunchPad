import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// Skip prerendering for this API route
export const dynamic = "force-dynamic";

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
    // Recalc financials snapshot when a quote status/payment changes
    if (update.status !== undefined || update.paidAt !== undefined || update.total !== undefined) {
      await recalcFinancials(businessId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { businessId, quoteId } = await params;
    await requireBusinessAccess(businessId);
    await prisma.quote.deleteMany({ where: { id: quoteId, businessId } });
    await recalcFinancials(businessId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

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
    const monthsWithData = Math.max(new Set(ytdReceipts.map((r) => r.date?.slice(0, 7))).size, 1);
    await prisma.business.update({
      where: { id: businessId },
      data: {
        totalExpensesYTD,
        totalRevenueYTD,
        profitMargin,
        monthlyExpenseAvg: totalExpensesYTD / monthsWithData,
        monthlyRevenueAvg: totalRevenueYTD / monthsWithData,
        financialsUpdatedAt: new Date(),
      },
    });
  } catch { /* non-blocking */ }
}
