import type { Metadata } from "next";
import Link from "next/link";
import { GlowBackground } from "@/components/brand/glow-background";
import { BreakNote } from "@/components/games/break-note";
import { GAMES } from "@/components/games/catalog";
import { Eyebrow } from "@/components/ui/eyebrow";

export const metadata: Metadata = { title: "Games" };

/** Small, calm games for breaks. No scores to chase, no streaks, no leaderboards. */
export default function GamesPage() {
  return (
    <>
      <GlowBackground mood="finish" />
      <div className="flex animate-rise-in flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Break games</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            Rest your <em>mind</em>
          </h1>
          <p className="max-w-lg text-ink-muted md:text-base">
            A few quiet things to do between blocks. Each one takes a couple of minutes and ends whenever you
            like.
          </p>
          <BreakNote />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {GAMES.map(({ id, name, blurb, minutes, icon: Icon }) => (
            <li key={id}>
              <Link
                href={`/app/games/${id}`}
                className="flex h-full items-start gap-4 rounded-lg p-5 focus-ring glass transition-colors hover:bg-white/[0.08] md:p-6"
              >
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-pill text-on-brand bg-gradient-orb"
                  aria-hidden="true"
                >
                  <Icon className="size-5 stroke-[1.5]" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="type-h3">{name}</span>
                  <span className="text-ink-muted">{blurb}</span>
                  <span className="type-body-sm text-ink-muted">{minutes}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
