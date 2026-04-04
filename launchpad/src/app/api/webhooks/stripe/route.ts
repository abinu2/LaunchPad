import { NextRequest, NextResponse } from "next/server";
import { getStripe, hasStripeWebhookConfig } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  if (!hasStripeWebhookConfig()) {
    return NextResponse.json({ received: false, disabled: true }, { status: 200 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { quoteId, businessId } = session.metadata ?? {};
    if (quoteId && businessId) {
      await prisma.quote.updateMany({
        where: { id: quoteId, businessId },
        data: {
          status: "paid",
          paidAt: new Date(),
          paymentMethod: "stripe",
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
