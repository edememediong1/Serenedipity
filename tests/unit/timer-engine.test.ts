import { describe, expect, it } from "vitest";
import {
  advance,
  createTimer,
  DEFAULT_SETTINGS,
  elapsedMs,
  formatClock,
  nextKind,
  pause,
  remainingMs,
  reset,
  start,
  tick,
} from "@/lib/timer/engine";

const S = DEFAULT_SETTINGS;
const MIN = 60_000;

describe("timer engine", () => {
  it("counts from timestamps, so background tabs stay accurate", () => {
    let t = start(createTimer(S), 0);
    expect(remainingMs(t, 10 * MIN)).toBe(15 * MIN); // no ticks needed in between
    t = tick(t, 10 * MIN);
    expect(t.status).toBe("running");
  });

  it("pauses and resumes without losing time", () => {
    let t = start(createTimer(S), 0);
    t = pause(t, 5 * MIN);
    expect(elapsedMs(t, 60 * MIN)).toBe(5 * MIN); // paused: the clock doesn't move
    t = start(t, 60 * MIN);
    expect(remainingMs(t, 62 * MIN)).toBe(18 * MIN);
  });

  it("finishes when time is up, even if the tick arrives late", () => {
    let t = start(createTimer(S), 0);
    t = tick(t, 40 * MIN);
    expect(t.status).toBe("finished");
    expect(remainingMs(t, 40 * MIN)).toBe(0);
  });

  it("gives a long break after every fourth focus block", () => {
    expect(nextKind("focus", 1, S)).toBe("short_break");
    expect(nextKind("focus", 4, S)).toBe("long_break");
    expect(nextKind("long_break", 4, S)).toBe("focus");
    let t = createTimer(S);
    const kinds: string[] = [];
    for (let i = 0; i < 8; i++) {
      t = advance(t, S);
      kinds.push(t.kind);
    }
    expect(kinds).toEqual([
      "short_break",
      "focus",
      "short_break",
      "focus",
      "short_break",
      "focus",
      "long_break",
      "focus",
    ]);
    expect(t.completedFocus).toBe(4);
  });

  it("skipping a focus block doesn't count it", () => {
    const t = advance(createTimer(S), S, false);
    expect(t.kind).toBe("short_break");
    expect(t.completedFocus).toBe(0);
  });

  it("reset restarts the same block", () => {
    const t = reset(pause(start(createTimer(S), 0), 3 * MIN), S);
    expect(t.status).toBe("idle");
    expect(remainingMs(t, 0)).toBe(25 * MIN);
  });

  it("formats the clock", () => {
    expect(formatClock(25 * MIN)).toBe("25:00");
    expect(formatClock(18 * MIN + 41_200)).toBe("18:42");
    expect(formatClock(0)).toBe("00:00");
  });
});
