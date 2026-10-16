import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckInCard } from "@/components/app/check-in-card";
import { MixRow } from "@/components/app/mix-row";
import { STATES, StateCard } from "@/components/app/state-cards";
import { TodayCard } from "@/components/app/today-card";
import { UnfinishedNudge } from "@/components/review/unfinished-nudge";
import { GlowBackground } from "@/components/brand/glow-background";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getSessionProfile } from "@/lib/auth/session";
import { getTodayStats } from "@/lib/focus/stats";
import { greeting } from "@/lib/greeting";
import { getStreak } from "@/lib/streaks/data";
import { hourIn } from "@/lib/review/stats";
import { StreakCard } from "@/components/streaks/streak-card";
import { listPlaylists } from "@/lib/music/data";
import { GAMES } from "@/components/games/catalog";

export const metadata: Metadata = { title: "Home" };

async function MobileGreeting() {
  const { profile } = await getSessionProfile();
  return (
    <Eyebrow className="lg:hidden">{greeting(new Date(), profile.timezone, profile.display_name)}</Eyebrow>
  );
}

async function Streak() {
  const [streak, { profile }] = await Promise.all([getStreak(), getSessionProfile()]);
  const evening = hourIn(new Date().toISOString(), profile.timezone) >= 18;
  return <StreakCard streak={streak} evening={evening} />;
}

async function Picked() {
  const playlists = await listPlaylists();
  return <MixRow playlists={playlists.filter((p) => p.featured)} />;
}

async function Today() {
  const stats = await getTodayStats();
  return <TodayCard minutes={stats.minutes} blocks={stats.blocks} />;
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

        <div className="lg:col-span-2">
          <Suspense fallback={<div className="h-32 rounded-lg bg-surface-deep/60" aria-hidden="true" />}>
            <Streak />
          </Suspense>
        </div>

        <div className="empty:hidden lg:col-span-2">
          <Suspense fallback={null}>
            <UnfinishedNudge />
          </Suspense>
        </div>
        <CheckInCard />
        {/* Mobile: Today sits at the end, as in the Home design. Desktop: beside the check-in. */}
        <div className="order-last lg:order-none">
          <Suspense fallback={<TodayCard />}>
            <Today />
          </Suspense>
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
          <Suspense
            fallback={
              <div
                role="status"
                aria-label="Loading music"
                className="h-[88px] rounded-lg bg-surface-deep/60"
              />
            }
          >
            <Picked />
          </Suspense>
        </section>

        <section aria-labelledby="break-heading" className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 id="break-heading" className="type-h2">
              Take a break
            </h2>
            <Link
              href="/app/games"
              className="inline-flex min-h-11 items-center rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
            >
              All games
            </Link>
          </div>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {GAMES.map(({ id, name, minutes, icon: Icon }) => (
              <li key={id}>
                <Link
                  href={`/app/games/${id}`}
                  className="flex h-full flex-col gap-3 rounded-lg p-4 focus-ring glass transition-colors hover:bg-white/[0.08]"
                >
                  <span
                    className="flex size-10 items-center justify-center rounded-pill text-on-brand bg-gradient-orb"
                    aria-hidden="true"
                  >
                    <Icon className="size-5 stroke-[1.5]" />
                  </span>
                  <span className="font-semibold">{name}</span>
                  <span className="type-body-sm text-ink-muted">{minutes}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
