import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { businessId } = await req.json();

    const quote = await prisma.quote.findFirst({ where: { id, businessId } });
    if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

    const business = await prisma.business.findUnique({ where: { id: businessId } });
    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const services = Array.isArray(quote.services)
      ? (quote.services as { serviceName: string; total: number; quantity: number }[])
      : [];

    const lineItems = services.map((s) => ({
      price_data: {
        currency: "usd",
        product_data: { name: s.serviceName },
        unit_amount: Math.round((s.total / s.quantity) * 100),
      },
      quantity: s.quantity,
    }));

    if (quote.taxAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Tax" },
          unit_amount: Math.round(quote.taxAmount * 100),
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      customer_email: quote.clientEmail,
      metadata: { quoteId: id, businessId },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/quotes/public/${id}?businessId=${businessId}&paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/quotes/public/${id}?businessId=${businessId}`,
    });

    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        paymentUrl: session.url,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("POST /api/quotes/[id]/pay:", err);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
