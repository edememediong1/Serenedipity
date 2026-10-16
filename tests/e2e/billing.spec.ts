import Stripe from "stripe";
import { expect, test } from "@playwright/test";
import { completeOnboarding, getProfile, signInAs } from "./helpers";

// Uses STRIPE_WEBHOOK_SECRET from .env.local to sign events exactly as Stripe would.
const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

function subscriptionEvent(userId: string, status: string, cancelAtPeriodEnd = false) {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: `evt_${Date.now()}`,
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: `sub_${userId.slice(0, 8)}`,
        object: "subscription",
        customer: `cus_${userId.slice(0, 8)}`,
        status,
        cancel_at_period_end: cancelAtPeriodEnd,
        trial_end: null,
        metadata: { user_id: userId },
        items: {
          data: [
            {
              price: { id: "price_yearly", recurring: { interval: "year" } },
              current_period_end: now + 30 * 86400,
            },
          ],
        },
      },
    },
  };
}

async function post(request: import("@playwright/test").APIRequestContext, payload: object, sign = true) {
  const body = JSON.stringify(payload);
  const header = sign ? stripe.webhooks.generateTestHeaderString({ payload: body, secret }) : "t=1,v1=bad";
  return request.post("/api/stripe/webhook", {
    data: body,
    headers: { "stripe-signature": header, "content-type": "application/json" },
  });
}

test.describe("billing webhook", () => {
  test.skip(!secret, "STRIPE_WEBHOOK_SECRET not set");

  test("rejects unsigned events", async ({ request }) => {
    const res = await post(request, { type: "customer.subscription.updated" }, false);
    expect(res.status()).toBe(400);
  });

  test("an active subscription switches the plan to Pro, and cancellation back to Free", async ({
    page,
    request,
  }) => {
    const { userId } = await signInAs(page, undefined, "/onboarding");
    await completeOnboarding(userId);

    expect((await post(request, subscriptionEvent(userId, "trialing"))).status()).toBe(200);
    expect((await getProfile(userId)).plan).toBe("premium");

    await page.goto("/app/settings", { waitUntil: "networkidle" });
    await expect(page.getByRole("main").getByText("Free trial · yearly")).toBeVisible();

    // Cancel at period end: still Pro until the period ends.
    await post(request, subscriptionEvent(userId, "active", true));
    expect((await getProfile(userId)).plan).toBe("premium");
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("main").getByText("Pro ends")).toBeVisible();

    await post(request, subscriptionEvent(userId, "canceled"));
    expect((await getProfile(userId)).plan).toBe("free");
  });
});
