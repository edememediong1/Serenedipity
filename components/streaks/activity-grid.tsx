"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { activityLevel, gridWeeks, type DayActivity } from "@/lib/streaks/engine";
import { cn } from "@/lib/utils";

const LEVEL_CLASS = [
  "bg-white/[0.06]",
  "bg-orange/30",
  "bg-orange/55",
  "bg-orange/80",
  "[background:linear-gradient(135deg,#ff8a4c,#7c4dff)]",
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function describe(date: string, d: DayActivity | undefined) {
  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  if (!d || (d.minutes === 0 && d.blocks === 0 && d.roomSessions === 0)) return `${label}: no focus time`;
  const parts = [
    d.blocks ? `${d.blocks} ${d.blocks === 1 ? "block" : "blocks"}` : null,
    `${d.minutes} min`,
    d.roomSessions ? `${d.roomSessions} room ${d.roomSessions === 1 ? "session" : "sessions"}` : null,
  ].filter(Boolean);
  return `${label}: ${parts.join(" · ")}`;
}

/**
 * GitHub-style activity grid: one dot per day, darker for more focus time (blocks and room
 * sessions). One tab stop; arrow keys move between days and the details read out below.
 */
export function ActivityGrid({
  days,
  today,
  weeks = 26,
}: {
  days: Record<string, DayActivity>;
  today: string;
  weeks?: number;
}) {
  const grid = gridWeeks(today, weeks);
  const [sel, setSel] = useState<{ w: number; d: number }>(() => ({
    w: weeks - 1,
    d: grid[weeks - 1].indexOf(today),
  }));
  // Hover previews a day without moving the keyboard selection (content can scroll under a still pointer).
  const [hover, setHover] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Start scrolled to the most recent weeks on narrow screens.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  const activeDays = Object.entries(days).filter(
    ([k, d]) => k >= grid[0][0] && (d.blocks > 0 || d.roomSessions > 0),
  ).length;
  const selected = grid[sel.w][sel.d];
  const date = hover ?? selected;

  function onKey(e: KeyboardEvent) {
    const move: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const m = move[e.key];
    if (!m) return;
    e.preventDefault();
    setHover(null);
    setSel(({ w, d }) => {
      const nw = Math.min(weeks - 1, Math.max(0, w + m[0]));
      const nd = Math.min(6, Math.max(0, d + m[1]));
      return grid[nw][nd] > today ? { w, d } : { w: nw, d: nd };
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={scroller} className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1.5">
          <div className="flex gap-[3px] pl-8 text-[11px] text-ink-muted" aria-hidden="true">
            {grid.map((week, w) => {
              const first = week[0];
              const showMonth = w > 0 && first.slice(5, 7) !== grid[w - 1][0].slice(5, 7);
              return (
                <span key={w} className="w-3 overflow-visible whitespace-nowrap">
                  {showMonth ? MONTHS[Number(first.slice(5, 7)) - 1] : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-2">
            <div
              className="flex w-6 flex-col gap-[3px] text-[11px] leading-3 text-ink-muted"
              aria-hidden="true"
            >
              {["Mon", "", "Wed", "", "Fri", "", ""].map((l, i) => (
                <span key={i} className="h-3">
                  {l}
                </span>
              ))}
            </div>
            <div
              role="grid"
              aria-label={`Activity over the last ${weeks} weeks: ${activeDays} active days. Use arrow keys to explore.`}
              aria-describedby="activity-detail"
              aria-activedescendant={`activity-${selected}`}
              tabIndex={0}
              onKeyDown={onKey}
              onPointerLeave={() => setHover(null)}
              className="flex gap-[3px] rounded-sm focus-ring"
            >
              {grid.map((week, w) => (
                <div key={w} role="row" className="flex flex-col gap-[3px]">
                  {week.map((day, d) => {
                    const future = day > today;
                    const isSelected = sel.w === w && sel.d === d;
                    return (
                      <span
                        key={day}
                        id={`activity-${day}`}
                        role="gridcell"
                        aria-selected={isSelected}
                        aria-label={future ? undefined : describe(day, days[day])}
                        onPointerEnter={(e) => e.pointerType === "mouse" && !future && setHover(day)}
                        onClick={() => {
                          if (future) return;
                          setSel({ w, d });
                          setHover(null);
                        }}
                        className={cn(
                          "size-3 rounded-[3px]",
                          future ? "opacity-0" : LEVEL_CLASS[activityLevel(days[day])],
                          isSelected && "ring-2 ring-blue-soft ring-offset-1 ring-offset-surface",
                          hover === day && !isSelected && "ring-1 ring-white/50",
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="activity-detail" className="type-body-sm" aria-live="polite">
          {describe(date, days[date])}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-ink-muted" aria-hidden="true">
          Less
          {LEVEL_CLASS.map((c, i) => (
            <span key={i} className={cn("size-3 rounded-[3px]", c)} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
