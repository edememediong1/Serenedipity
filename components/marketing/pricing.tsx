"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { PRICING } from "@/lib/config";
import { cn } from "@/lib/utils";

type Period = "monthly" | "yearly";

const FREE_FEATURES = [
  "Rotating music selection",
  "Pomodoro timer",
  "1 check-in with your focus guide a day",
  "1 trial focus room",
];
const PREMIUM_FEATURES = [
  "The full music library",
  "Binaural focus layer",
  "Unlimited check-ins and re-plans",
  "All focus rooms",
  "History and insights",
];

const yearlySaving = Math.round((1 - PRICING.yearly / (PRICING.monthly * 12)) * 100);

function Price({ amount, suffix }: { amount: string; suffix: string }) {
  return (
    <p className="flex items-baseline gap-1">
      <span className="font-display text-[52px] leading-[54px] tabular-nums">{amount}</span>
      <span className="text-ink-muted">{suffix}</span>
    </p>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3">
          <Check className="mt-0.5 size-[18px] shrink-0 stroke-[1.5] text-blue-soft" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PricingPlans() {
  const [period, setPeriod] = useState<Period>("yearly");
  const premiumPlan = period === "yearly" ? "premium-yearly" : "premium-monthly";

  return (
    <div className="flex flex-col items-center gap-8">
      <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-pill p-1 glass">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={period === p}
            onClick={() => setPeriod(p)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
                e.preventDefault();
                const next = p === "monthly" ? "yearly" : "monthly";
                setPeriod(next);
                (
                  e.currentTarget.parentElement?.querySelector(
                    `[data-period="${next}"]`,
                  ) as HTMLButtonElement | null
                )?.focus();
              }
            }}
            tabIndex={period === p ? 0 : -1}
            data-period={p}
            className={cn(
              "min-h-11 rounded-pill px-5 type-body-sm focus-ring transition-colors duration-300",
              period === p
                ? "text-on-brand [background:var(--gradient-primary)]"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {p === "monthly" ? "Monthly" : `Yearly · save ${yearlySaving}%`}
          </button>
        ))}
      </div>

      <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
        <GlassCard className="flex flex-col gap-6 p-6 md:p-8">
          <div className="flex flex-col gap-2">
            <h3 className="type-h2">Free</h3>
            <p className="text-ink-muted">A calm place to start.</p>
          </div>
          <Price amount="$0" suffix="forever" />
          <FeatureList items={FREE_FEATURES} />
          <Button asChild variant="secondary" block className="mt-auto">
            <Link href="/signup?plan=free">Start free</Link>
          </Button>
        </GlassCard>

        <GlassCard className="relative flex flex-col gap-6 overflow-hidden border-violet/50 p-6 md:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-pill bg-violet/30 blur-3xl"
          />
          <div className="relative flex flex-col gap-2">
            <h3 className="type-h2">Premium</h3>
            <p className="text-ink-muted">Everything, for your deepest work.</p>
          </div>
          <div className="relative" aria-live="polite">
            {period === "yearly" ? (
              <>
                <Price amount={`$${PRICING.yearly}`} suffix="/ year" />
                <p className="type-body-sm text-ink-muted">
                  About ${(PRICING.yearly / 12).toFixed(2)} a month, billed yearly.
                </p>
              </>
            ) : (
              <>
                <Price amount={`$${PRICING.monthly}`} suffix="/ month" />
                <p className="type-body-sm text-ink-muted">Billed monthly. Cancel anytime.</p>
              </>
            )}
          </div>
          <div className="relative">
            <FeatureList items={PREMIUM_FEATURES} />
          </div>
          {/* TODO(billing): route to Stripe Checkout once billing ships. For now, sign up and remember the choice. */}
          <Button asChild block className="relative mt-auto">
            <Link href={`/signup?plan=${premiumPlan}`}>Get Premium</Link>
          </Button>
        </GlassCard>
      </div>
      <p className="type-body-sm text-ink-muted">Prices in US dollars.</p>
    </div>
  );
}
