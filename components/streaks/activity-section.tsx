import { GlassCard } from "@/components/ui/glass-card";
import { StatTile } from "@/components/ui/stat-tile";
import { getStreak } from "@/lib/streaks/data";
import { ActivityGrid } from "./activity-grid";
import { Flame } from "./flame";

/** Review: streak numbers plus the 26-week activity grid. */
export async function ActivitySection() {
  const s = await getStreak();
  const sessions = Object.values(s.days).reduce((n, d) => n + d.roomSessions, 0);
  return (
    <section id="activity" aria-labelledby="activity-heading" className="flex scroll-mt-24 flex-col gap-4">
      <h2 id="activity-heading" className="type-h2">
        Your activity
      </h2>
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Current streak"
          value={
            <span className="inline-flex items-center gap-1.5">
              {s.current}
              <Flame size={26} lit={s.current > 0} />
            </span>
          }
          hint={s.current === 1 ? "day" : "days"}
        />
        <StatTile label="Best streak" value={s.best} hint={s.best === 1 ? "day" : "days"} />
        <StatTile label="Room sessions" value={sessions} hint="this year" />
      </div>
      <GlassCard className="p-4 md:p-6">
        <ActivityGrid days={s.days} today={s.today} />
      </GlassCard>
      <p className="type-body-sm text-ink-muted">
        A day counts when you finish a focus block or spend ten minutes in a room.{" "}
        {s.restPerWeek
          ? `Up to ${s.restPerWeek} missed ${s.restPerWeek === 1 ? "day" : "days"} a week won't break your streak.`
          : "Strict mode: every day counts."}{" "}
        Change this in Settings.
      </p>
    </section>
  );
}
