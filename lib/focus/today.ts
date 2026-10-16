/** Start of "today" in an IANA time zone, as an ISO timestamp (falls back to UTC midnight). */
export function startOfToday(tz: string | null, now = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const sinceMidnightMs =
      ((get("hour") * 60 + get("minute")) * 60 + get("second")) * 1000 + now.getMilliseconds();
    return new Date(now.getTime() - sinceMidnightMs).toISOString();
  } catch {
    const d = new Date(now);
    d.setUTCHours(0, 0, 0, 0);
    return d.toISOString();
  }
}
