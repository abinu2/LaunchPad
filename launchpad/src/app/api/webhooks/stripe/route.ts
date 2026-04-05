/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events (payment confirmations, etc.)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  try {
    // Bypass if Stripe is not configured
    if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
      console.warn("Stripe webhook secret not configured - bypassing webhook");
      return NextResponse.json({ received: true });
    }

    let Stripe: any;
    try {
      Stripe = require("stripe");
    } catch {
      console.warn("Stripe not installed - bypassing webhook");
      return NextResponse.json({ received: true });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    });

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    let event: any;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Handle payment_intent.succeeded
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as any;
      const quoteId = paymentIntent.metadata?.quoteId;

      if (quoteId) {
        await prisma.quote.update({
          where: { id: quoteId },
          data: {
            status: "paid",
            paidAt: new Date(),
            stripePaymentIntentId: paymentIntent.id,
          },
        });
      }
    }

    // Handle payment_intent.payment_failed
    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as any;
      const quoteId = paymentIntent.metadata?.quoteId;

      if (quoteId) {
        await prisma.quote.update({
          where: { id: quoteId },
          data: { status: "declined" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
