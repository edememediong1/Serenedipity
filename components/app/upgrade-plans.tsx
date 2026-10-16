"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { startCheckout } from "@/app/app/upgrade/actions";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GUIDE_NAME, PRICING } from "@/lib/config";
import { cn } from "@/lib/utils";

const PRO_FEATURES = [
  "Unlimited check-ins and re-plans with " + GUIDE_NAME,
  "Weekly reflections on how your week went",
  "The full music library and the binaural layer",
  "Every focus room",
  "Full history and insights in Review",
];

function Submit({ trial, disabled }: { trial: boolean; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending || disabled}>
      {pending ? "Opening secure checkout…" : trial ? "Start your 7-day free trial" : "Upgrade to Pro"}
    </Button>
  );
}

export function UpgradePlans({ configured, trialEligible }: { configured: boolean; trialEligible: boolean }) {
  const [interval, setInterval] = useState<"month" | "year">("year");
  const saving = Math.round((1 - PRICING.yearly / (PRICING.monthly * 12)) * 100);
  return (
    <GlassCard className="relative mx-auto flex w-full max-w-lg flex-col gap-6 overflow-hidden border-violet/50 p-6 md:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-pill bg-violet/30 blur-3xl"
      />
      <div
        role="radiogroup"
        aria-label="Billing period"
        className="relative inline-flex w-fit rounded-pill p-1 glass"
      >
        {(["month", "year"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={interval === p}
            onClick={() => setInterval(p)}
            className={cn(
              "min-h-11 rounded-pill px-5 type-body-sm focus-ring transition-colors",
              interval === p
                ? "text-on-brand [background:var(--gradient-primary)]"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {p === "month" ? "Monthly" : `Yearly · save ${saving}%`}
          </button>
        ))}
      </div>
      <div className="relative">
        <p className="flex items-baseline gap-1">
          <span className="font-display text-[56px] leading-[58px] tabular-nums">
            ${interval === "year" ? PRICING.yearly : PRICING.monthly}
          </span>
          <span className="text-ink-muted">/ {interval}</span>
        </p>
        <p className="type-body-sm text-ink-muted">
          {interval === "year"
            ? `About $${(PRICING.yearly / 12).toFixed(2)} a month, billed yearly.`
            : "Billed monthly. Cancel anytime."}
          {trialEligible
            ? " Free for the first 7 days; you won't be charged if you cancel before the trial ends."
            : ""}
        </p>
      </div>
      <ul className="relative flex flex-col gap-3">
        {PRO_FEATURES.map((f) => (
          <li key={f} className="flex items-start gap-3">
            <Check className="mt-0.5 size-[18px] shrink-0 stroke-[1.5] text-blue-soft" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
      <form action={startCheckout.bind(null, interval)} className="relative">
        <Submit trial={trialEligible} disabled={!configured} />
      </form>
      {!configured ? (
        <p className="relative type-body-sm text-ink-muted" role="note">
          Payments aren&apos;t switched on yet. Add the Stripe keys to enable checkout.
        </p>
      ) : (
        <p className="relative type-body-sm text-ink-muted">
          Secure payment by Stripe. Prices in US dollars.
        </p>
      )}
    </GlassCard>
  );
}
