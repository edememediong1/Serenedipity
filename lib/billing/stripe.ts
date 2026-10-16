import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

export function billingConfigured() {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_MONTHLY &&
    process.env.STRIPE_PRICE_YEARLY
  );
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(key, { appInfo: { name: "Serenedipity" } });
  return client;
}

export function priceFor(interval: "month" | "year") {
  const id = interval === "year" ? process.env.STRIPE_PRICE_YEARLY : process.env.STRIPE_PRICE_MONTHLY;
  if (!id) throw new Error(`STRIPE_PRICE_${interval === "year" ? "YEARLY" : "MONTHLY"} is not set.`);
  return id;
}

/** Free trial length for new subscribers (PRD section 7: 7 days, card required). */
export const TRIAL_DAYS = 7;

/** Statuses that keep Pro switched on. Cancelling keeps Pro until the period ends (Stripe keeps it "active"). */
export const PRO_STATUSES = new Set(["trialing", "active", "past_due"]);
