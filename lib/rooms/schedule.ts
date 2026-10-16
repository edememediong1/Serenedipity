/**
 * Room timing. Every client derives the same session, phase and music position from the room's
 * schedule plus the server clock, so a room stays in sync without broadcasting ticks (PRD 6:
 * "track X started at time T"; each app plays from the right position and re-syncs if it drifts).
 */

export type RoomTiming = {
  /** "once" | "hourly" | "daily" | "weekdays" (checked by the database). */
  schedule: string;
  starts_at: string;
  session_minutes: number;
  focus_minutes: number;
  break_minutes: number;
};

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function period(schedule: string) {
  return schedule === "hourly" ? HOUR : schedule === "once" ? Infinity : DAY;
}

const isWeekend = (ms: number) => {
  const d = new Date(ms).getUTCDay();
  return d === 0 || d === 6;
};

/** Start of the occurrence at or before `now` (or null if the first one hasn't happened). */
export function previousStart(room: RoomTiming, now: number): number | null {
  const anchor = Date.parse(room.starts_at);
  if (now < anchor) return null;
  const p = period(room.schedule);
  if (!Number.isFinite(p)) return anchor;
  let start = anchor + Math.floor((now - anchor) / p) * p;
  if (room.schedule === "weekdays") while (isWeekend(start) && start >= anchor) start -= DAY;
  return start >= anchor ? start : null;
}

/** Start of the next occurrence strictly after `now` (null for a past one-off room). */
export function nextStart(room: RoomTiming, now: number): number | null {
  const anchor = Date.parse(room.starts_at);
  if (now < anchor) return anchor;
  const p = period(room.schedule);
  if (!Number.isFinite(p)) return null;
  let start = anchor + (Math.floor((now - anchor) / p) + 1) * p;
  if (room.schedule === "weekdays") while (isWeekend(start)) start += DAY;
  return start;
}

export type RoomPhase =
  | { live: false; nextStart: number | null }
  | {
      live: true;
      sessionStart: number;
      sessionEnd: number;
      phase: "focus" | "break";
      /** ms left in the current phase. */
      remaining: number;
      /** Phase length in ms (for the ring). */
      phaseLength: number;
      lap: number;
      laps: number;
      nextBreakAt: number | null;
    };

/** Where a room is right now: waiting for its next session, or live in a focus/break phase. */
export function roomPhase(room: RoomTiming, now: number): RoomPhase {
  const start = previousStart(room, now);
  const sessionLength = room.session_minutes * MIN;
  if (start === null || now >= start + sessionLength) return { live: false, nextStart: nextStart(room, now) };

  const focus = room.focus_minutes * MIN;
  const brk = room.break_minutes * MIN;
  const cycle = focus + brk;
  const end = start + sessionLength;
  const elapsed = now - start;
  const index = Math.floor(elapsed / cycle);
  const inCycle = elapsed - index * cycle;
  const cycleStart = start + index * cycle;
  const inFocus = inCycle < focus;
  const phaseEndRaw = inFocus ? cycleStart + focus : cycleStart + cycle;
  const phaseEnd = Math.min(phaseEndRaw, end);
  const phaseStart = inFocus ? cycleStart : cycleStart + focus;
  const breakAt = cycleStart + focus;

  return {
    live: true,
    sessionStart: start,
    sessionEnd: end,
    phase: inFocus ? "focus" : "break",
    remaining: Math.max(0, phaseEnd - now),
    phaseLength: Math.max(1, phaseEnd - phaseStart),
    lap: index + 1,
    laps: Math.max(1, Math.ceil(sessionLength / cycle)),
    nextBreakAt: inFocus && breakAt < end ? breakAt : null,
  };
}

/** Seconds into a looping track that everyone should hear right now. */
export function trackPosition(sessionStart: number, now: number, durationSeconds: number) {
  if (durationSeconds <= 0) return 0;
  return ((now - sessionStart) / 1000) % durationSeconds;
}

/** Human description of a schedule, in the viewer's locale and time zone. */
export function describeSchedule(room: RoomTiming, tz?: string | null) {
  const at = new Date(room.starts_at);
  const fmt = (o: Intl.DateTimeFormatOptions) => {
    try {
      return new Intl.DateTimeFormat("en-US", { ...o, timeZone: tz || undefined }).format(at);
    } catch {
      return new Intl.DateTimeFormat("en-US", o).format(at);
    }
  };
  const time = fmt({ hour: "numeric", minute: "2-digit" });
  switch (room.schedule) {
    case "hourly":
      return at.getUTCMinutes() === 0
        ? "Every hour on the hour"
        : `Every hour at :${String(at.getUTCMinutes()).padStart(2, "0")}`;
    case "daily":
      return `Every day at ${time}`;
    case "weekdays":
      return `Weekdays at ${time}`;
    default:
      return fmt({ weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }
}
