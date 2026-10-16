import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckInCard } from "@/components/app/check-in-card";
import { MixRow } from "@/components/app/mix-row";
import { STATES, StateCard } from "@/components/app/state-cards";
import { TodayCard } from "@/components/app/today-card";
import { GlowBackground } from "@/components/brand/glow-background";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getSessionProfile } from "@/lib/auth/session";
import { greeting } from "@/lib/greeting";
import { MIXES } from "@/lib/seed/mixes";

export const metadata: Metadata = { title: "Home" };

async function MobileGreeting() {
  const { profile } = await getSessionProfile();
  return (
    <Eyebrow className="lg:hidden">{greeting(new Date(), profile.timezone, profile.display_name)}</Eyebrow>
  );
}

export default function HomePage() {
  return (
    <>
      <GlowBackground />
      <div className="grid animate-rise-in grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <header className="flex flex-col gap-2 lg:col-span-2">
          <Suspense
            fallback={<span className="h-3.5 w-32 rounded-sm bg-surface-deep lg:hidden" aria-hidden="true" />}
          >
            <MobileGreeting />
          </Suspense>
          <h1 className="type-hero lg:type-hero-lg">
            Find your <em>focus</em>
          </h1>
        </header>

        <CheckInCard />
        {/* Mobile: Today sits at the end, as in the Home design. Desktop: beside the check-in. */}
        <div className="order-last lg:order-none">
          <TodayCard />
        </div>

        <section aria-labelledby="states-heading" className="flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 id="states-heading" className="type-h2">
              Choose a state
            </h2>
            <Link
              href="/app/listen"
              className="inline-flex min-h-11 items-center rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
            >
              All music
            </Link>
          </div>
          <ul className="grid grid-cols-3 gap-3 md:gap-4">
            {STATES.map((state) => (
              <li key={state.id}>
                <StateCard state={state} href={`/app/listen?state=${state.id}`} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="picked-heading" className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <h2 id="picked-heading" className="type-h2">
            Picked for you
          </h2>
          <MixRow mixes={MIXES} />
        </section>
      </div>
    </>
  );
}
