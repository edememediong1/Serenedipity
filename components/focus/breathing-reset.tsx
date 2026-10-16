"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { formatClock } from "@/lib/timer/engine";

const TOTAL_MS = 2 * 60_000;
const HALF_MS = 4000; // grow over 4 seconds, shrink over 4 (design system: Motion)

/** The 2-minute reset: a breathing orb before the first block. Under reduced motion the orb stays still. */
export function BreathingReset({ onDone }: { onDone: () => void }) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = now - startedAt;
  const remaining = Math.max(0, TOTAL_MS - elapsed);
  const inhale = Math.floor(elapsed / HALF_MS) % 2 === 0;

  useEffect(() => {
    if (remaining === 0) onDone();
  }, [remaining, onDone]);

  return (
    <section
      aria-labelledby="reset-heading"
      className="flex animate-rise-in flex-col items-center gap-8 py-6 text-center"
    >
      <div className="flex flex-col gap-2">
        <Eyebrow>2-minute reset</Eyebrow>
        <h1 id="reset-heading" className="type-h1 md:text-[48px] md:leading-[52px]">
          Breathe <em>with it</em>
        </h1>
      </div>
      <div className="relative flex size-64 items-center justify-center" aria-hidden="true">
        <span
          className="absolute rounded-pill opacity-90 shadow-[0_0_80px_rgba(124,77,255,0.45)] transition-transform ease-in-out bg-gradient-orb motion-reduce:transition-none"
          style={{
            width: 160,
            height: 160,
            transform: `scale(${inhale ? 1.35 : 0.85})`,
            transitionDuration: `${HALF_MS}ms`,
          }}
        />
      </div>
      {/* Visual cue only; announcing it every 4 seconds would be noisy for screen readers. */}
      <p className="type-h2" aria-hidden="true">
        {inhale ? "Breathe in" : "Breathe out"}
      </p>
      <p className="sr-only">Breathe slowly: in for four seconds, out for four.</p>
      <p className="type-body-sm text-ink-muted tabular-nums">{formatClock(remaining)} left</p>
      <Button variant="ghost" onClick={onDone}>
        Skip to my first block
      </Button>
    </section>
  );
}
