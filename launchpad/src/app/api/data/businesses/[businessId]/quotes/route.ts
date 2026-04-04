import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { serializeQuote } from "@/lib/serializers";

type Params = { params: Promise<{ businessId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const status = req.nextUrl.searchParams.get("status");
    const rows = await prisma.quote.findMany({
      where: { businessId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(rows.map(serializeQuote));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { businessId } = await params;
    await requireBusinessAccess(businessId);
    const data = await req.json();
    const row = await prisma.quote.create({
      data: {
        businessId,
        clientName: data.clientName ?? "",
        clientEmail: data.clientEmail ?? "",
        clientPhone: data.clientPhone ?? "",
        services: data.services ?? [],
        subtotal: data.subtotal ?? 0,
        taxRate: data.taxRate ?? 0,
        taxAmount: data.taxAmount ?? 0,
        total: data.total ?? 0,
        pricingAnalysis: data.pricingAnalysis ?? undefined,
        status: data.status ?? "draft",
        sentAt: data.sentAt ? new Date(data.sentAt) : null,
        viewedAt: data.viewedAt ? new Date(data.viewedAt) : null,
        acceptedAt: data.acceptedAt ? new Date(data.acceptedAt) : null,
        paidAt: data.paidAt ? new Date(data.paidAt) : null,
        contractGenerated: data.contractGenerated ?? false,
        contractId: data.contractId ?? null,
        contractSignedAt: data.contractSignedAt ? new Date(data.contractSignedAt) : null,
        stripePaymentIntentId: data.stripePaymentIntentId ?? null,
        paymentMethod: data.paymentMethod ?? null,
        paymentUrl: data.paymentUrl ?? null,
        scheduledDate: data.scheduledDate ?? null,
        scheduledTime: data.scheduledTime ?? null,
        scheduledAddress: data.scheduledAddress ?? null,
        followUpsSent: data.followUpsSent ?? 0,
        lastFollowUpAt: data.lastFollowUpAt ? new Date(data.lastFollowUpAt) : null,
        nextFollowUpAt: data.nextFollowUpAt ? new Date(data.nextFollowUpAt) : null,
      },
    });
    return NextResponse.json({ id: row.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unauthorized" }, { status: 401 });
  }
}
