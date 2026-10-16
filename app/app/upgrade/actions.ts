"use server";

import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth/session";
import { billingConfigured, getStripe, priceFor, TRIAL_DAYS } from "@/lib/billing/stripe";
import { getRequestOrigin } from "@/lib/server/origin";
import { createAdminClient } from "@/lib/supabase/admin";

async function customerFor(userId: string, email: string | null) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (data?.stripe_customer_id) return data.stripe_customer_id;
  const customer = await getStripe().customers.create({
    email: email ?? undefined,
    metadata: { user_id: userId },
  });
  await admin
    .from("subscriptions")
    .upsert({ user_id: userId, stripe_customer_id: customer.id, status: "none" });
  return customer.id;
}

/** Starts Stripe Checkout for Pro. New subscribers get the free trial. */
export async function startCheckout(interval: "month" | "year") {
  if (!billingConfigured()) redirect("/app/upgrade?status=unavailable");
  const { user, profile } = await getSessionProfile();
  if (profile.plan === "premium") redirect("/app/settings#plan");

  let url: string | null = null;
  try {
    const origin = await getRequestOrigin();
    const customer = await customerFor(user.id, user.email);
    const { data: prior } = await createAdminClient()
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: user.id,
      line_items: [{ price: priceFor(interval), quantity: 1 }],
      // One trial per person: only offer it if they've never subscribed.
      subscription_data: {
        metadata: { user_id: user.id },
        ...(prior?.stripe_subscription_id ? {} : { trial_period_days: TRIAL_DAYS }),
      },
      allow_promotion_codes: true,
      success_url: `${origin}/app/upgrade?status=success`,
      cancel_url: `${origin}/app/upgrade?status=cancelled`,
    });
    url = session.url;
  } catch (error) {
    console.error("[billing] checkout failed", error);
  }
  redirect(url ?? "/app/upgrade?status=error");
}

/** Opens the Stripe customer portal (change plan, update card, cancel, invoices). */
export async function openBillingPortal() {
  if (!billingConfigured()) redirect("/app/settings?billing=unavailable#plan");
  const { user } = await getSessionProfile();
  let url: string | null = null;
  try {
    const { data } = await createAdminClient()
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data?.stripe_customer_id) {
      const session = await getStripe().billingPortal.sessions.create({
        customer: data.stripe_customer_id,
        return_url: `${await getRequestOrigin()}/app/settings#plan`,
      });
      url = session.url;
    }
  } catch (error) {
    console.error("[billing] portal failed", error);
  }
  redirect(url ?? "/app/upgrade");
}
