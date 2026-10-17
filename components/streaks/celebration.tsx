"use client";

import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { StreakEvent } from "@/lib/streaks/engine";
import { STREAK_EVENT } from "./events";
import { Flame } from "./flame";

const SEEN_KEY = "streak-celebrated";
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2;
  const r = 90 + (i % 3) * 22;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r - 20, delay: (i % 4) * 60 };
});

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Once a day, when the first block (or a ten-minute room session) extends the streak, a short
 * celebration: the flame, sparks and the count ticking up. Mounted once in the app shell.
 */
export function StreakCelebration() {
  const [event, setEvent] = useState<NonNullable<StreakEvent> | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    function onStreak(e: Event) {
      const detail = (e as CustomEvent<NonNullable<StreakEvent>>).detail;
      try {
        if (localStorage.getItem(SEEN_KEY) === todayKey()) return;
        localStorage.setItem(SEEN_KEY, todayKey());
      } catch {
        // Without storage we may celebrate twice in a day; that's fine.
      }
      setShown(Math.max(0, detail.current - 1));
      setEvent(detail);
    }
    window.addEventListener(STREAK_EVENT, onStreak);
    return () => window.removeEventListener(STREAK_EVENT, onStreak);
  }, []);

  // Tick the number up shortly after opening.
  useEffect(() => {
    if (!event) return;
    const id = window.setTimeout(() => setShown(event.current), 450);
    return () => window.clearTimeout(id);
  }, [event]);

  const n = event?.current ?? 0;
  const title = n <= 1 ? "Day one" : `${n}-day streak`;
  const line =
    n <= 1
      ? "Your first block today. Come back tomorrow to keep it going."
      : event && n >= event.best
        ? "Your longest streak yet. Steady does it."
        : "Today counts. One block at a time.";

  return (
    <Dialog.Root open={!!event} onOpenChange={(open) => !open && setEvent(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-surface/80 backdrop-blur-md data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-5 rounded-lg bg-surface-deep/95 p-8 text-center glass outline-none data-[state=open]:animate-fade-in">
          <div className="relative flex size-40 items-center justify-center">
            <span className="absolute inset-6 rounded-pill bg-orange/25 blur-2xl" aria-hidden="true" />
            {SPARKS.map((s, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="spark absolute size-2 rounded-pill [background:linear-gradient(135deg,#ffb15c,#ff6f61)]"
                style={
                  {
                    "--spark-x": `${s.x}px`,
                    "--spark-y": `${s.y}px`,
                    animationDelay: `${200 + s.delay}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
            <Flame size={120} className="streak-pop relative" />
          </div>
          <p className="text-[56px] leading-none font-extralight tabular-nums" aria-hidden="true">
            <span key={shown} className="streak-pop inline-block">
              {shown}
            </span>
          </p>
          <Dialog.Title className="type-h1">{title}</Dialog.Title>
          <Dialog.Description className="text-ink-muted">{line}</Dialog.Description>
          <Dialog.Close asChild>
            <Button block>Keep going</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
