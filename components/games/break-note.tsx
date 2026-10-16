"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Coffee } from "lucide-react";
import { useTimer } from "@/components/focus/timer-provider";
import { formatClock, remainingMs } from "@/lib/timer/engine";

/**
 * Ties games to your focus session: shows how much break is left, and when the break ends,
 * says so gently with a way back. Nothing here keeps you playing.
 */
export function BreakNote() {
  const t = useTimer();
  const onBreak = t.active && !t.done && t.timer.kind !== "focus";
  const [wasOnBreak, setWasOnBreak] = useState(onBreak);
  const [ended, setEnded] = useState(false);
  // Adjust state while rendering when the break starts or ends (no effect needed).
  if (wasOnBreak !== onBreak) {
    setWasOnBreak(onBreak);
    setEnded(wasOnBreak && !onBreak);
  }

  if (ended)
    return (
      <div
        role="status"
        className="flex flex-wrap items-center gap-3 rounded-md border border-line bg-surface-deep/70 px-4 py-3 glass"
      >
        <Coffee className="size-5 stroke-[1.5] text-blue-soft" aria-hidden="true" />
        <p className="flex-1 type-body-sm">Break&apos;s over. Your next block is ready when you are.</p>
        <Link
          href="/app/focus"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
        >
          Back to focus <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
        </Link>
      </div>
    );
  if (!onBreak) return null;
  return (
    <p className="type-body-sm text-ink-muted">
      On a break · <span className="tabular-nums">{formatClock(remainingMs(t.timer, t.now))}</span> left.
      We&apos;ll let you know when it&apos;s time.
    </p>
  );
}
