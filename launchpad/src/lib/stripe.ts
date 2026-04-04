/**
 * Stripe server client — server-side only.
 * ONLY import in API routes.
 */
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function hasStripeConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function hasStripeWebhookConfig() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe is not configured");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeClient;
}
