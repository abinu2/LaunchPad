import { NextRequest, NextResponse } from "next/server";
import { requireBusinessAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { businessId, ...quoteData } = body;
    if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

    await requireBusinessAccess(businessId);

    const quote = await prisma.quote.create({
      data: {
        businessId,
        clientName: quoteData.clientName ?? "",
        clientEmail: quoteData.clientEmail ?? "",
        clientPhone: quoteData.clientPhone ?? "",
        services: quoteData.services ?? [],
        subtotal: quoteData.subtotal ?? 0,
        taxRate: quoteData.taxRate ?? 0,
        taxAmount: quoteData.taxAmount ?? 0,
        total: quoteData.total ?? 0,
        pricingAnalysis: quoteData.pricingAnalysis ?? undefined,
        status: quoteData.status ?? "draft",
      },
    });

    return NextResponse.json({ id: quote.id });
  } catch (err) {
    console.error("POST /api/quotes:", err);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
