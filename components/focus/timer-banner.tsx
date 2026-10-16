"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Pause, Play, Timer } from "lucide-react";
import { elapsedMs, formatClock, kindLabel, progress, remainingMs } from "@/lib/timer/engine";
import { getTechnique } from "@/lib/timer/techniques";
import { useTimer } from "./timer-provider";

/**
 * Shown at the top of every app page (except the timer itself) while a session is underway:
 * the live clock, the lap count, pause/resume and a way back to the timer.
 */
export function TimerBanner() {
  const t = useTimer();
  const pathname = usePathname();
  if (!t.active || t.done || pathname === "/app/focus") return null;

  const flowing = !!t.settings.openEnded && t.timer.kind === "focus";
  const clock = formatClock(flowing ? elapsedMs(t.timer, t.now) : remainingMs(t.timer, t.now));
  const label = t.awaitingCheck
    ? "Block finished"
    : t.timer.status === "paused"
      ? "Paused"
      : kindLabel(t.timer.kind);
  const pct = flowing ? 0 : progress(t.timer, t.now);

  return (
    <div
      className="sticky top-16 z-20 -mx-3 pt-2 lg:top-0 lg:mx-0 lg:pt-3"
      role="region"
      aria-label="Timer running"
    >
      <div className="relative flex items-center gap-2 overflow-hidden rounded-md bg-surface-deep/85 px-3 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)] glass sm:gap-3">
        {/* thin progress line along the bottom */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-0.5 [background:linear-gradient(90deg,var(--gradient-ring-from),var(--gradient-ring-to))]"
          style={{ width: `${pct * 100}%` }}
        />
        <span
          className="hidden size-9 shrink-0 items-center justify-center rounded-pill text-on-brand bg-gradient-orb sm:flex"
          aria-hidden="true"
        >
          <Timer className="size-4 stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate type-body-sm text-ink">
            <span className="font-semibold">{label}</span>
            <span className="text-ink-muted">
              {" "}
              · Lap {t.lap}/{t.laps}
              <span className="hidden sm:inline"> · {getTechnique(t.technique).name}</span>
            </span>
          </p>
          {t.title ? <p className="truncate text-xs text-ink-muted">{t.title}</p> : null}
        </div>
        <span
          className="text-xl font-light tabular-nums sm:text-2xl"
          aria-label={flowing ? `${clock} focused` : `${clock} remaining`}
        >
          {clock}
        </span>
        {!t.awaitingCheck ? (
          <button
            type="button"
            onClick={t.playPause}
            aria-label={t.timer.status === "running" ? "Pause timer" : "Resume timer"}
            className="flex size-11 shrink-0 items-center justify-center rounded-pill bg-white/[0.08] focus-ring hover:bg-white/[0.14]"
          >
            {t.timer.status === "running" ? (
              <Pause className="size-4 fill-current" aria-hidden="true" />
            ) : (
              <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
            )}
          </button>
        ) : null}
        <Link
          href="/app/focus"
          aria-label={t.awaitingCheck ? "Check in on the finished block" : "Open the timer"}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-pill type-body-sm font-semibold text-blue-soft focus-ring hover:underline sm:px-3"
        >
          <span className="hidden sm:inline" aria-hidden="true">
            {t.awaitingCheck ? "Check in" : "Open"}
          </span>
          <ChevronRight className="size-5 stroke-[1.5] sm:hidden" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
