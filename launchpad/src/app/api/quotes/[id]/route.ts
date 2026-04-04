import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeQuote } from "@/lib/serializers";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const businessId = req.nextUrl.searchParams.get("businessId");
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  const quote = await prisma.quote.findFirst({ where: { id, businessId } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let viewQuote = quote;
  if (quote.status === "sent") {
    viewQuote = await prisma.quote.update({
      where: { id: quote.id },
      data: { status: "viewed", viewedAt: new Date() },
    });
  }

  const business = await prisma.business.findUnique({ where: { id: businessId } });

  return NextResponse.json({
    quote: serializeQuote(viewQuote),
    business: {
      businessName: business?.businessName,
      ownerName: business?.ownerName,
      ownerPhone: business?.ownerPhone,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { businessId, ...updates } = await req.json();
  if (!businessId) return NextResponse.json({ error: "businessId required" }, { status: 400 });

  await prisma.quote.updateMany({
    where: { id, businessId },
    data: updates,
  });

  return NextResponse.json({ success: true });
}
