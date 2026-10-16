"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const STEPS = [
  { label: "Breathe in", ms: 4000, scale: 1.35 },
  { label: "Hold", ms: 4000, scale: 1.35 },
  { label: "Breathe out", ms: 6000, scale: 0.8 },
] as const;
const CYCLE = STEPS.reduce((s, x) => s + x.ms, 0);

/** Follow the bubble: in for 4, hold for 4, out for 6. Under reduced motion the words lead instead. */
export function BreathingBubble() {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [startedAt]);

  const elapsed = startedAt === null ? 0 : Math.max(0, now - startedAt);
  const inCycle = elapsed % CYCLE;
  let acc = 0;
  let step: (typeof STEPS)[number] = STEPS[0];
  for (const s of STEPS) {
    if (inCycle < acc + s.ms) {
      step = s;
      break;
    }
    acc += s.ms;
  }
  const breaths = Math.floor(elapsed / CYCLE);
  const running = startedAt !== null;

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative flex size-60 items-center justify-center" aria-hidden="true">
        <span
          className="absolute size-36 rounded-pill opacity-90 shadow-[0_0_80px_rgba(124,77,255,0.45)] transition-transform ease-in-out bg-gradient-orb motion-reduce:transition-none"
          style={{
            transform: `scale(${running ? step.scale : 1})`,
            transitionDuration: `${step.ms}ms`,
          }}
        />
      </div>
      <p className="type-h2" aria-hidden="true">
        {running ? step.label : "Ready when you are"}
      </p>
      <p className="sr-only">Breathe in for four seconds, hold for four, then breathe out for six.</p>
      {running ? (
        <p className="type-body-sm text-ink-muted" role="status">
          {breaths === 0 ? "First breath" : `${breaths} ${breaths === 1 ? "breath" : "breaths"}`}
        </p>
      ) : null}
      <Button
        variant={running ? "ghost" : "secondary"}
        onClick={() => {
          if (running) setStartedAt(null);
          else {
            const t = Date.now();
            setNow(t);
            setStartedAt(t);
          }
        }}
      >
        {running ? "Stop" : "Start breathing"}
      </Button>
    </div>
  );
}
