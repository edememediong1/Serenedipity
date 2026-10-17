import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, LogOut, Sparkles } from "lucide-react";
import { openBillingPortal } from "@/app/app/upgrade/actions";
import { Suspense } from "react";
import { signOut } from "@/app/(auth)/actions";
import { DeleteCheckins } from "@/components/app/delete-checkins";
import { SettingsForm } from "@/components/app/settings-form";
import { StreakSettings } from "@/components/streaks/streak-settings";
import { GlowBackground } from "@/components/brand/glow-background";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { getSessionProfile } from "@/lib/auth/session";
import { focusLengthFor, GOALS, MUSIC_STYLES, WORK_STYLES } from "@/lib/validation/onboarding";

export const metadata: Metadata = { title: "Settings" };

const only = <T extends string>(list: readonly { value: T }[], values: string[]) =>
  values.filter((v): v is T => list.some((o) => o.value === v));

async function SettingsContent() {
  const { user, profile } = await getSessionProfile();
  const workStyle = WORK_STYLES.find((w) => w.value === profile.work_style)?.value ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <SettingsForm
        defaults={{
          display_name: profile.display_name ?? "",
          goals: only(GOALS, profile.goals),
          work_style: workStyle,
          focus_length: focusLengthFor(profile.default_focus_minutes).value,
          music_prefs: only(MUSIC_STYLES, profile.music_prefs),
          has_headphones: profile.has_headphones === null ? null : profile.has_headphones ? "yes" : "no",
        }}
      />
      <div className="flex flex-col gap-6">
        <PlanCard />
        <GlassCard id="streaks" className="flex scroll-mt-24 flex-col gap-3 p-6">
          <h2 className="type-h2">Streaks</h2>
          <StreakSettings restDays={profile.streak_rest_days} />
        </GlassCard>
        <GlassCard className="flex flex-col gap-4 p-6">
          <h2 className="type-h2">Check-ins</h2>
          <DeleteCheckins />
        </GlassCard>
        <GlassCard className="flex flex-col gap-4 p-6">
          <h2 className="type-h2">Account</h2>
          <p className="flex flex-col">
            <span className="type-body-sm text-ink-muted">Signed in as</span>
            <span className="break-all">{user.email}</span>
          </p>
          <form action={signOut}>
            <Button type="submit" variant="secondary" block>
              <LogOut aria-hidden="true" /> Sign out
            </Button>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}

const SUB_LABEL: Record<string, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment due",
  canceled: "Cancelled",
  unpaid: "Unpaid",
  incomplete: "Incomplete",
  paused: "Paused",
};

async function PlanCard() {
  const { user, profile, supabase } = await getSessionProfile();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select(
      "status, billing_interval, current_period_end, cancel_at_period_end, trial_end, stripe_customer_id",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  const pro = profile.plan === "premium";
  const date = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;
  const ends = date(sub?.current_period_end ?? null);
  return (
    <GlassCard id="plan" className="flex scroll-mt-24 flex-col gap-4 p-6">
      <h2 className="type-h2">Plan</h2>
      <p className="flex items-center justify-between">
        <span className="text-ink-muted">Current plan</span>
        <span className="rounded-pill border border-line px-3 py-0.5 type-body-sm">
          {pro ? "Pro" : "Free"}
        </span>
      </p>
      {sub && sub.status !== "none" ? (
        <dl className="flex flex-col gap-1 type-body-sm">
          <div className="flex justify-between">
            <dt className="text-ink-muted">Billing</dt>
            <dd>
              {SUB_LABEL[sub.status] ?? sub.status}
              {sub.billing_interval ? ` · ${sub.billing_interval === "year" ? "yearly" : "monthly"}` : ""}
            </dd>
          </div>
          {ends ? (
            <div className="flex justify-between">
              <dt className="text-ink-muted">
                {sub.cancel_at_period_end ? "Pro ends" : sub.status === "trialing" ? "Trial ends" : "Renews"}
              </dt>
              <dd>{sub.status === "trialing" && sub.trial_end ? date(sub.trial_end) : ends}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {sub?.stripe_customer_id && sub.status !== "none" ? (
        <form action={openBillingPortal}>
          <Button type="submit" variant="secondary" block>
            <CreditCard aria-hidden="true" /> Manage billing
          </Button>
        </form>
      ) : null}
      {!pro ? (
        <Button asChild block>
          <Link href="/app/upgrade">
            <Sparkles aria-hidden="true" /> Upgrade to Pro
          </Link>
        </Button>
      ) : null}
      <p className="type-body-sm text-ink-muted">
        Pro unlocks unlimited check-ins, weekly reflections, the full library, the binaural layer and every
        room.
      </p>
    </GlassCard>
  );
}

export default function SettingsPage() {
  return (
    <>
      <GlowBackground />
      <div className="flex animate-rise-in flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Eyebrow>Settings</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            Make it <em>yours</em>
          </h1>
          <p className="max-w-lg text-ink-muted md:text-base">Update your name and the answers from setup.</p>
        </header>
        <Suspense
          fallback={
            <div className="h-96 rounded-lg bg-surface-deep/60" role="status" aria-label="Loading settings" />
          }
        >
          <SettingsContent />
        </Suspense>
      </div>
    </>
  );
}
