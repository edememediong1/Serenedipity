/**
 * Time-zone helpers without a date library. All take an IANA zone (or null for UTC).
 * Tested in tests/unit/time.test.ts, including DST changes.
 */

/** Minutes the zone is ahead of UTC at a given instant (e.g. Lagos = +60, New York in summer = -240). */
export function zoneOffsetMinutes(at: number, tz: string | null) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || "UTC",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(at));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
    );
    return Math.round((asUtc - Math.floor(at / 1000) * 1000) / 60_000);
  } catch {
    return 0;
  }
}

/** The UTC instant for a local wall-clock time ("2026-10-17", "14:30") in a zone. */
export function zonedTimeToUtc(dateKey: string, hhmm: string, tz: string | null) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = hhmm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the offset correctly around DST changes.
  let utc = guess - zoneOffsetMinutes(guess, tz) * 60_000;
  utc = guess - zoneOffsetMinutes(utc, tz) * 60_000;
  return new Date(utc);
}

/** "YYYY-MM-DD" for an instant in a zone. */
export function localDateKey(at: number | Date, tz: string | null) {
  const d = typeof at === "number" ? new Date(at) : at;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** UTC instant when the local day containing `at` began. */
export function startOfLocalDay(at: number, tz: string | null) {
  return zonedTimeToUtc(localDateKey(at, tz), "00:00", tz);
}

/** "2:30 PM" in a zone. */
export function formatLocalTime(iso: string, tz: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "UTC",
    }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  }
}

/** "14:30" in a zone (for <input type="time"> values). */
export function localHHMM(iso: string, tz: string | null) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: tz || "UTC",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toISOString().slice(11, 16);
  }
}
