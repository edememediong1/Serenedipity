import type { Metadata } from "next";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Flame, X } from "lucide-react";
import { Suspense } from "react";
import { ActivitySection } from "@/components/streaks/activity-section";
import { GlowBackground } from "@/components/brand/glow-background";
import { ProgressRing } from "@/components/brand/progress-ring";
import { ReflectionPanel } from "@/components/review/reflection-panel";
import { ResolveButtons } from "@/components/review/resolve-buttons";
import { BarChart } from "@/components/ui/bar-chart";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { StatTile } from "@/components/ui/stat-tile";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { loadReviewRange } from "@/lib/review/data";
import { addDays, dayKey, longDate, reviewWeek, shortDay, streak, summarizeDay } from "@/lib/review/stats";
import { getTechnique } from "@/lib/timer/techniques";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Review" };

const OUTCOME: Record<string, string> = {
  done: "Done",
  more_time: "Needed more time",
  stuck: "Got stuck",
  skipped: "Skipped",
  reset: "Reset",
};

function formatMinutes(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
}

function monthDay(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function timeOf(iso: string, tz: string | null) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz || "UTC",
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

async function ReviewContent({ searchParams }: { searchParams: PageProps<"/app/review">["searchParams"] }) {
  const params = await searchParams;
  const { user, profile } = await getSessionProfile();
  const today = dayKey(new Date(), profile.timezone);
  const view = params.view === "week" ? "week" : "day";
  const requested =
    typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;
  // Day view opens on yesterday by default ("how did yesterday go?"); week view ends today.
  const date = requested && requested <= today ? requested : view === "day" ? addDays(today, -1) : today;
  const range = await loadReviewRange(date);
  const step = view === "day" ? 1 : 7;
  const href = (d: string, v = view) => `/app/review?view=${v}&date=${d}`;
  const label =
    view === "day"
      ? date === today
        ? "Today"
        : date === addDays(today, -1)
          ? "Yesterday"
          : longDate(date)
      : `${monthDay(addDays(date, -6))} – ${monthDay(date)}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <nav aria-label="Review period" className="inline-flex w-fit rounded-pill p-1 glass">
          {(["day", "week"] as const).map((v) => (
            <Link
              key={v}
              href={href(v === "day" ? addDays(today, -1) : today, v)}
              aria-current={view === v ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-pill px-5 type-body-sm focus-ring transition-colors",
                view === v
                  ? "text-on-brand [background:var(--gradient-primary)]"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              {v === "day" ? "Day" : "Week"}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href={href(addDays(date, -step))}
            aria-label={view === "day" ? "Previous day" : "Previous week"}
            className="flex size-11 items-center justify-center rounded-pill border border-line focus-ring hover:bg-white/[0.06]"
          >
            <ChevronLeft className="size-5 stroke-[1.5]" aria-hidden="true" />
          </Link>
          <p className="min-w-40 text-center type-h3" aria-live="polite">
            {label}
          </p>
          {addDays(date, step) <= today || date < today ? (
            <Link
              href={href(addDays(date, step) > today ? today : addDays(date, step))}
              aria-label={view === "day" ? "Next day" : "Next week"}
              className="flex size-11 items-center justify-center rounded-pill border border-line focus-ring hover:bg-white/[0.06]"
            >
              <ChevronRight className="size-5 stroke-[1.5]" aria-hidden="true" />
            </Link>
          ) : (
            <span className="size-11" aria-hidden="true" />
          )}
        </div>
      </div>

      {view === "day" ? (
        <DayView date={date} today={today} range={range} />
      ) : (
        <WeekView
          date={date}
          range={range}
          canReflect={profile.plan === "premium" || isAdmin(profile, user.email)}
        />
      )}
    </div>
  );
}

type Range = Awaited<ReturnType<typeof loadReviewRange>>;

function DayView({ date, today, range }: { date: string; today: string; range: Range }) {
  const d = summarizeDay(date, range.blocks, range.tasks, range.tz);
  const tasks = range.tasks.filter((t) => dayKey(t.created_at, range.tz) === date);
  const blocks = range.blocks.filter((b) => dayKey(b.started_at, range.tz) === date);
  const mood = range.moods.find((m) => m.date === date)?.mood;
  const empty = !blocks.length && !tasks.length;

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Day summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Focus time" value={formatMinutes(d.focusMinutes)} />
        <StatTile label="Laps completed" value={d.laps} />
        <StatTile
          label="Tasks done"
          value={d.planned ? `${d.done} of ${d.planned}` : "—"}
          hint={d.skipped ? `${d.skipped} let go` : undefined}
        />
        <GlassCard padding="sm" className="flex items-center gap-4 rounded-md md:p-5">
          <ProgressRing
            value={(d.achievement ?? 0) / 100}
            size={64}
            strokeWidth={6}
            label="Achievement rate"
            valueText={d.achievement === null ? "Nothing planned" : `${d.achievement}%`}
          >
            <span className="text-sm tabular-nums">{d.achievement === null ? "—" : `${d.achievement}%`}</span>
          </ProgressRing>
          <div>
            <p className="type-body-sm text-ink-muted">Achievement</p>
            <p className="type-body-sm">{d.achievement === null ? "No plan this day" : "of planned tasks"}</p>
          </div>
        </GlassCard>
      </section>

      {mood ? (
        <p className="type-body-sm text-ink-muted">
          You checked in feeling <span className="text-ink">{mood}</span>.
        </p>
      ) : null}

      {empty ? (
        <GlassCard className="flex flex-col items-start gap-3 p-6">
          <p className="type-h2">{date === today ? "Nothing logged yet today." : "A quiet day."}</p>
          <p className="text-ink-muted">
            Rest days count too. When you&apos;re ready, one lap is a good start.
          </p>
          <Link
            href="/app/focus"
            className="rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
          >
            Start a focus block
          </Link>
        </GlassCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassCard className="flex flex-col gap-4">
            <h2 className="type-h2">Tasks</h2>
            {tasks.length ? (
              <ul className="flex flex-col gap-3">
                {tasks.map((t) => (
                  <li key={t.id} className="flex flex-col gap-2 rounded-md bg-white/[0.04] p-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-pill border",
                          t.status === "done"
                            ? "border-transparent text-on-brand [background:var(--gradient-primary)]"
                            : "border-line",
                        )}
                        aria-hidden="true"
                      >
                        {t.status === "done" ? (
                          <Check className="size-4" />
                        ) : t.status === "skipped" ? (
                          <X className="size-4 text-ink-muted" />
                        ) : null}
                      </span>
                      <span className={cn("flex-1", t.status === "skipped" && "text-ink-muted line-through")}>
                        {t.title}
                      </span>
                      <span className="type-body-sm text-ink-muted">
                        {t.status === "done" ? "Done" : t.status === "skipped" ? "Let go" : "Open"}
                      </span>
                    </div>
                    {t.status === "todo" && date < today ? (
                      <ResolveButtons taskId={t.id} title={t.title} />
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-ink-muted">No plan this day. Focus blocks still count.</p>
            )}
          </GlassCard>

          <GlassCard className="flex flex-col gap-4">
            <h2 className="type-h2">Timeline</h2>
            {blocks.length ? (
              <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
                {blocks.map((b, i) => (
                  <li key={`${b.started_at}-${i}`} className="relative">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-1.5 -left-[25px] size-2.5 rounded-pill ring-4 ring-surface-deep",
                        b.completed ? "[background:var(--gradient-primary)]" : "bg-track",
                      )}
                    />
                    <p className="type-body-sm text-ink-muted">
                      {timeOf(b.started_at, range.tz)} ·{" "}
                      {b.technique ? getTechnique(b.technique).name : "Focus"}
                    </p>
                    <p>{b.task_title || "Focus block"}</p>
                    <p className="type-body-sm text-ink-muted">
                      {formatMinutes(Math.round(b.focused_seconds / 60))} focused
                      {b.outcome ? ` · ${OUTCOME[b.outcome] ?? b.outcome}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-ink-muted">No focus blocks this day.</p>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function WeekView({ date, range, canReflect }: { date: string; range: Range; canReflect: boolean }) {
  const w = reviewWeek(date, range.blocks, range.tasks, range.tz);
  const s = streak(range.blocks, date, range.tz);
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Week summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Focus time"
          value={formatMinutes(w.focusMinutes)}
          hint={`${w.activeDays} of 7 days`}
        />
        <StatTile label="Laps completed" value={w.laps} />
        <StatTile
          label="Achievement rate"
          value={w.achievement === null ? "—" : `${w.achievement}%`}
          hint={w.planned ? `${w.done} of ${w.planned} tasks` : "No plans this week"}
        />
        <StatTile
          label="Streak"
          value={
            <span className="inline-flex items-center gap-2">
              {s}
              <Flame className="size-6 stroke-[1.5] text-orange" aria-hidden="true" />
            </span>
          }
          hint={s === 1 ? "day in a row" : "days in a row"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="flex flex-col gap-4">
          <h2 className="type-h3">Focus minutes per day</h2>
          <BarChart
            title="Focus minutes per day"
            data={w.days.map((d) => ({
              label: shortDay(d.date),
              value: d.focusMinutes,
              display: `${d.focusMinutes} min`,
            }))}
          />
        </GlassCard>
        <GlassCard className="flex flex-col gap-4">
          <h2 className="type-h3">Achievement rate per day</h2>
          <BarChart
            title="Share of planned tasks finished, per day"
            max={100}
            formatTick={(v) => `${v}%`}
            data={w.days.map((d) => ({
              label: shortDay(d.date),
              value: d.achievement ?? 0,
              display:
                d.achievement === null ? "nothing planned" : `${d.achievement}% (${d.done} of ${d.planned})`,
            }))}
          />
        </GlassCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="flex flex-col gap-3">
          <h2 className="type-h2">What went well</h2>
          {w.wentWell.length ? (
            <ul className="flex flex-col gap-2">
              {w.wentWell.map((x) => (
                <li key={x} className="flex gap-3">
                  <Check
                    className="mt-0.5 size-[18px] shrink-0 stroke-[1.5] text-blue-soft"
                    aria-hidden="true"
                  />
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">This week is just getting started.</p>
          )}
        </GlassCard>
        <GlassCard className="flex flex-col gap-3">
          <h2 className="type-h2">What to work on</h2>
          {w.toImprove.length ? (
            <ul className="flex flex-col gap-2">
              {w.toImprove.map((x) => (
                <li key={x} className="flex gap-3">
                  <ChevronRight
                    className="mt-0.5 size-[18px] shrink-0 stroke-[1.5] text-blue-soft"
                    aria-hidden="true"
                  />
                  {x}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-muted">Nothing stands out. Keep the rhythm going.</p>
          )}
        </GlassCard>
      </div>

      <ReflectionPanel endDate={date} canUse={canReflect} />
    </div>
  );
}

export default function ReviewPage({ searchParams }: PageProps<"/app/review">) {
  return (
    <>
      <GlowBackground mood="finish" />
      <div className="flex animate-rise-in flex-col gap-8">
        <header className="flex flex-col gap-3">
          <Eyebrow>Review</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            How it <em>went</em>
          </h1>
          <p className="max-w-lg text-ink-muted md:text-base">
            Look back at any day: what you planned, what you finished, and where your focus went.
          </p>
        </header>
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading your review"
              className="h-96 rounded-lg bg-surface-deep/60"
            />
          }
        >
          <ReviewContent searchParams={searchParams} />
        </Suspense>
        <Suspense fallback={<div className="h-64 rounded-lg bg-surface-deep/60" aria-hidden="true" />}>
          <ActivitySection />
        </Suspense>
      </div>
    </>
  );
}
