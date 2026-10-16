export type PartOfDay = "morning" | "afternoon" | "evening";

/** Part of day for a moment in a given IANA time zone (falls back to UTC). */
export function partOfDay(date: Date, timeZone?: string | null): PartOfDay {
  let hour: number;
  try {
    hour = Number(
      new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: timeZone ?? "UTC",
      }).format(date),
    );
  } catch {
    hour = date.getUTCHours();
  }
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

export function greeting(date: Date, timeZone?: string | null, name?: string | null) {
  const base = `Good ${partOfDay(date, timeZone)}`;
  return name ? `${base}, ${name}` : base;
}
