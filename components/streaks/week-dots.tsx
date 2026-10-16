import { Moon } from "lucide-react";
import type { DayState } from "@/lib/streaks/engine";
import { cn } from "@/lib/utils";

const LETTER = ["M", "T", "W", "T", "F", "S", "S"];
const NAME = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SAY: Record<DayState, string> = {
  active: "focused",
  rest: "rest day",
  missed: "no focus",
  today: "today, not yet",
  future: "coming up",
};

/** Monday-to-Sunday row: filled for active days, a moon for rest days, a ring for today. */
export function WeekDots({
  week,
  animateDate,
}: {
  week: { date: string; state: DayState }[];
  /** A date to animate filling in (the celebration). */
  animateDate?: string;
}) {
  return (
    <ol className="flex gap-2" aria-label="This week">
      {week.map((d, i) => (
        <li key={d.date} className="flex flex-col items-center gap-1">
          <span className="text-[11px] font-semibold text-ink-muted" aria-hidden="true">
            {LETTER[i]}
          </span>
          <span
            className={cn(
              "flex size-7 items-center justify-center rounded-pill",
              d.state === "active" && "[background:linear-gradient(135deg,#ff8a4c,#7c4dff)]",
              d.state === "active" && d.date === animateDate && "dot-fill",
              d.state === "rest" && "bg-white/[0.08] text-blue-soft",
              d.state === "missed" && "bg-white/[0.05]",
              d.state === "today" && "border-2 border-dashed border-orange/70",
              d.state === "future" && "border border-line",
            )}
          >
            {d.state === "rest" ? <Moon className="size-3.5 stroke-[1.75]" aria-hidden="true" /> : null}
            <span className="sr-only">
              {NAME[i]}: {SAY[d.state]}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
