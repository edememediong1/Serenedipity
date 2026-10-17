import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import type { StreakData } from "@/lib/streaks/data";
import { cn } from "@/lib/utils";
import { Flame } from "./flame";
import { WeekDots } from "./week-dots";

/** Plain-language status. Kind by design: never "you lost your streak". */
export function streakMessage(
  s: Pick<StreakData, "current" | "activeToday" | "atRisk" | "restDaysLeftThisWeek">,
) {
  if (s.activeToday) return s.current === 1 ? "Day one. A good start." : "Today counts. Nice work.";
  if (s.current === 0) return "One focus block today starts a new streak.";
  if (s.atRisk) return `Your ${s.current}-day streak needs a block today.`;
  const rest = s.restDaysLeftThisWeek;
  return `One block keeps your ${s.current}-day streak going.${rest ? ` ${rest} rest ${rest === 1 ? "day" : "days"} left this week.` : ""}`;
}

/**
 * Home streak card. In the evening, if today isn't done yet, it becomes a gentle reminder
 * (`evening` is computed on the server in the person's time zone).
 */
export function StreakCard({ streak, evening }: { streak: StreakData; evening: boolean }) {
  const remind = evening && streak.current > 0 && !streak.activeToday;
  return (
    <GlassCard
      className={cn(
        "flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6",
        remind && "border-orange/50 shadow-[0_0_40px_rgba(255,138,76,0.18)]",
      )}
      role={remind ? "status" : undefined}
    >
      <div className="flex items-center gap-4">
        <Flame size={56} lit={streak.current > 0} />
        <div>
          <p className="text-[40px] leading-[44px] font-extralight tabular-nums">
            {streak.current}
            <span className="sr-only"> day streak</span>
          </p>
          <p className="type-body-sm text-ink-muted" aria-hidden="true">
            day streak
          </p>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:items-end">
        <WeekDots week={streak.week} />
        <p className={cn("type-body-sm sm:text-right", remind ? "text-ink" : "text-ink-muted")}>
          {remind ? "Evening check-in: " : ""}
          {streakMessage(streak)}
        </p>
        <div className="flex flex-wrap gap-x-5 sm:justify-end">
          {!streak.activeToday ? (
            <Link
              href="/app/focus"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
            >
              Start a block <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
            </Link>
          ) : null}
          <Link
            href="/app/review#activity"
            className="inline-flex min-h-11 items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
          >
            Your activity <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}
