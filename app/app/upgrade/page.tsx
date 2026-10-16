import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UpgradePlans } from "@/components/app/upgrade-plans";
import { GlowBackground } from "@/components/brand/glow-background";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { getSessionProfile } from "@/lib/auth/session";
import { billingConfigured } from "@/lib/billing/stripe";

export const metadata: Metadata = { title: "Upgrade to Pro" };

const STATUS: Record<string, string> = {
  success: "Thank you. Your Pro plan is being switched on; it usually takes a few seconds.",
  cancelled: "Checkout was cancelled. Nothing was charged.",
  error: "We couldn't open checkout just now. Please try again.",
  unavailable: "Payments aren't switched on yet.",
};

async function UpgradeContent({ searchParams }: { searchParams: PageProps<"/app/upgrade">["searchParams"] }) {
  const params = await searchParams;
  const { profile, supabase, user } = await getSessionProfile();
  const status = typeof params.status === "string" ? params.status : null;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-6">
      {status && STATUS[status] ? (
        <GlassCard padding="sm" role="status" className="mx-auto w-full max-w-lg rounded-md">
          {STATUS[status]}
        </GlassCard>
      ) : null}
      {profile.plan === "premium" ? (
        <GlassCard className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 p-6">
          <p className="type-h2">You&apos;re on Pro.</p>
          <p className="text-ink-muted">
            Everything is unlocked. You can change or cancel your plan from Settings.
          </p>
          <Button asChild>
            <Link href="/app/settings#plan">Manage your plan</Link>
          </Button>
        </GlassCard>
      ) : (
        <UpgradePlans configured={billingConfigured()} trialEligible={!sub?.stripe_subscription_id} />
      )}
    </div>
  );
}

export default function UpgradePage({ searchParams }: PageProps<"/app/upgrade">) {
  return (
    <>
      <GlowBackground mood="finish" />
      <div className="flex animate-rise-in flex-col gap-8">
        <header className="mx-auto flex max-w-lg flex-col items-center gap-3 text-center">
          <Eyebrow>Pro</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            Go <em>further</em>
          </h1>
          <p className="text-ink-muted md:text-base">Everything in Serenedipity, with no daily limits.</p>
        </header>
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading plans"
              className="mx-auto h-96 w-full max-w-lg rounded-lg bg-surface-deep/60"
            />
          }
        >
          <UpgradeContent searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
