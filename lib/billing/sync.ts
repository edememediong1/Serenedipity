import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRO_STATUSES } from "./stripe";

const toIso = (s: number | null | undefined) => (s ? new Date(s * 1000).toISOString() : null);

type SubStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/**
 * Mirrors a Stripe subscription into `subscriptions` and switches `profiles.plan`.
 * Called only from the verified webhook (service role).
 */
export async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string | null) {
  const admin = createAdminClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  let userId: string | null = userIdHint || (sub.metadata?.user_id ?? null);
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    console.error("[billing] no user for customer", customerId);
    return;
  }

  const item = sub.items.data[0];
  const interval = item?.price?.recurring?.interval;
  await admin.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    status: sub.status as SubStatus,
    price_id: item?.price?.id ?? null,
    billing_interval: interval === "year" || interval === "month" ? interval : null,
    current_period_end: toIso(item?.current_period_end),
    cancel_at_period_end: sub.cancel_at_period_end,
    trial_end: toIso(sub.trial_end),
    updated_at: new Date().toISOString(),
  });
  await admin
    .from("profiles")
    .update({ plan: PRO_STATUSES.has(sub.status) ? "premium" : "free" })
    .eq("id", userId);
}
