/**
 * Pomodoro timer engine. Pure and timestamp-based: remaining time is always derived from
 * wall-clock timestamps, never from counting ticks, so it stays accurate when the tab is in
 * the background or the screen sleeps (PRD 4.3).
 */

export type BlockKind = "focus" | "short_break" | "long_break";
export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type TimerSettings = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  /** A long break replaces the short break after this many completed focus blocks. */
  longBreakEvery: number;
  /** Flowtime: focus counts up to focusMinutes (a cap); the next break is a fifth of the time focused. */
  openEnded?: boolean;
};

export type TimerState = {
  status: TimerStatus;
  kind: BlockKind;
  durationMs: number;
  /** Epoch ms when the current run segment started (null unless running). */
  segmentStartedAt: number | null;
  /** Time already elapsed in earlier segments of this block (before pauses). */
  elapsedBeforeMs: number;
  /** Focus blocks completed in this session. */
  completedFocus: number;
};

export const DEFAULT_SETTINGS: TimerSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  openEnded: false,
};

const MINUTE = 60_000;

export function durationFor(kind: BlockKind, s: TimerSettings) {
  const minutes =
    kind === "focus" ? s.focusMinutes : kind === "short_break" ? s.shortBreakMinutes : s.longBreakMinutes;
  return minutes * MINUTE;
}

export function createTimer(
  settings: TimerSettings,
  kind: BlockKind = "focus",
  completedFocus = 0,
): TimerState {
  return {
    status: "idle",
    kind,
    durationMs: durationFor(kind, settings),
    segmentStartedAt: null,
    elapsedBeforeMs: 0,
    completedFocus,
  };
}

export function elapsedMs(state: TimerState, now: number) {
  const running =
    state.status === "running" && state.segmentStartedAt !== null ? now - state.segmentStartedAt : 0;
  return Math.min(state.durationMs, Math.max(0, state.elapsedBeforeMs + running));
}

export function remainingMs(state: TimerState, now: number) {
  return Math.max(0, state.durationMs - elapsedMs(state, now));
}

export function progress(state: TimerState, now: number) {
  return state.durationMs === 0 ? 0 : elapsedMs(state, now) / state.durationMs;
}

export function start(state: TimerState, now: number): TimerState {
  if (state.status === "running" || state.status === "finished") return state;
  return { ...state, status: "running", segmentStartedAt: now };
}

export function pause(state: TimerState, now: number): TimerState {
  if (state.status !== "running") return state;
  return { ...state, status: "paused", elapsedBeforeMs: elapsedMs(state, now), segmentStartedAt: null };
}

/** Marks the block finished once its time is up. Call on every tick; returns the same object if nothing changed. */
export function tick(state: TimerState, now: number): TimerState {
  if (state.status === "running" && remainingMs(state, now) === 0) {
    return { ...state, status: "finished", elapsedBeforeMs: state.durationMs, segmentStartedAt: null };
  }
  return state;
}

/** Restarts the current block from zero (keeps the kind). */
export function reset(state: TimerState, settings: TimerSettings): TimerState {
  return createTimer(settings, state.kind, state.completedFocus);
}

/** Which block follows: breaks always lead back to focus; every Nth focus block earns a long break. */
export function nextKind(kind: BlockKind, completedFocusAfter: number, settings: TimerSettings): BlockKind {
  if (kind !== "focus") return "focus";
  return completedFocusAfter > 0 && completedFocusAfter % settings.longBreakEvery === 0
    ? "long_break"
    : "short_break";
}

/**
 * Moves to the next block. `countFocus` is false when a focus block is skipped without being done,
 * so skipping doesn't earn long breaks.
 */
export function advance(
  state: TimerState,
  settings: TimerSettings,
  countFocus = true,
  now = Date.now(),
): TimerState {
  const completed = state.kind === "focus" && countFocus ? state.completedFocus + 1 : state.completedFocus;
  const next = createTimer(settings, nextKind(state.kind, completed, settings), completed);
  if (settings.openEnded && state.kind === "focus" && next.kind !== "focus") {
    return { ...next, durationMs: flowBreakMs(elapsedMs(state, now)) };
  }
  return next;
}

/** Flowtime break: a fifth of the focus time, rounded to the minute, between 5 and 30 minutes. */
export function flowBreakMs(focusedMs: number) {
  const minutes = Math.min(30, Math.max(5, Math.round(focusedMs / MINUTE / 5)));
  return minutes * MINUTE;
}

/** True once the session's laps are all done. */
export function sessionComplete(state: TimerState, laps: number) {
  return state.completedFocus >= laps;
}

/** The lap in progress (1-based), capped at the total. */
export function currentLap(state: TimerState, laps: number) {
  return Math.min(laps, state.completedFocus + (state.kind === "focus" ? 1 : 0));
}

export function formatClock(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function kindLabel(kind: BlockKind) {
  return kind === "focus" ? "Focus" : kind === "short_break" ? "Short break" : "Long break";
}
