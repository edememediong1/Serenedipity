"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BellOff,
  Check,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
} from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { getUnstuck } from "@/app/app/focus/actions";
import { ProgressRing } from "@/components/brand/progress-ring";
import { LunaBadge } from "@/components/luna/luna-badge";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { GlassCard } from "@/components/ui/glass-card";
import { GUIDE_NAME } from "@/lib/config";
import { elapsedMs, formatClock, kindLabel, progress, remainingMs } from "@/lib/timer/engine";
import { getTechnique, TECHNIQUES, type TechniqueId } from "@/lib/timer/techniques";
import { cn } from "@/lib/utils";
import { BreathingReset } from "./breathing-reset";
import { useTimer, type CustomLengths, type FocusPlan, type FocusTask } from "./timer-provider";

export type { FocusPlan, FocusTask };

type Props = {
  plan: FocusPlan | null;
  startWithReset: boolean;
  technique: TechniqueId;
  laps: number;
  custom: CustomLengths;
};

export function FocusTimer({ plan, startWithReset, technique, laps, custom }: Props) {
  const t = useTimer();
  const [showReset, setShowReset] = useState(startWithReset);
  const [stuckOpen, setStuckOpen] = useState(false);

  // Hand the saved preferences and today's plan to the session (no-op while a session is running).
  const { init } = t;
  useEffect(() => {
    init({ technique, laps, custom, plan });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per server payload
  }, [plan?.id, technique, laps]);

  useEffect(() => {
    const clock = formatClock(
      t.settings.openEnded && t.timer.kind === "focus"
        ? elapsedMs(t.timer, t.now)
        : remainingMs(t.timer, t.now),
    );
    document.title =
      t.timer.status === "running" || t.timer.status === "paused"
        ? `${clock} · ${kindLabel(t.timer.kind)}`
        : "Focus";
    return () => {
      document.title = "Focus";
    };
  }, [t.now, t.timer, t.settings.openEnded]);

  if (showReset) return <BreathingReset onDone={() => setShowReset(false)} />;

  const isFocus = t.timer.kind === "focus";
  const flowing = !!t.settings.openEnded && isFocus;
  const shownMs = flowing ? elapsedMs(t.timer, t.now) : remainingMs(t.timer, t.now);
  const clock = formatClock(shownMs);
  const setup = !t.active && !t.done;
  const tech = getTechnique(t.technique);
  const nextIsLong =
    t.timer.completedFocus + 1 > 0 && (t.timer.completedFocus + 1) % t.settings.longBreakEvery === 0;
  const lastLap = t.timer.completedFocus + 1 >= t.laps;
  const nextLabel = isFocus
    ? lastLap
      ? "Last lap. Then a proper rest."
      : flowing
        ? "Next: a break a fifth as long as this block"
        : `Next: ${nextIsLong ? `${t.settings.longBreakMinutes}-minute long break` : `${t.settings.shortBreakMinutes}-minute break`}`
    : `Next: lap ${t.timer.completedFocus + 1} of ${t.laps}${t.title ? `, ${t.title}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <p className="type-body-sm text-ink-muted">
        {t.done
          ? `${tech.name} · session complete`
          : `${tech.name} · Lap ${t.lap} of ${t.laps}${plan?.deadlineLabel && t.currentTask ? ` · due ${plan.deadlineLabel}` : ""}`}
      </p>

      {t.done ? (
        <h1 className="type-h1 md:text-[48px] md:leading-[52px]">
          Session <em>complete</em>
        </h1>
      ) : isFocus ? (
        t.title && (t.currentTask || t.override || t.timer.status !== "idle") ? (
          <h1 className="type-h1 md:text-[44px] md:leading-[48px]">{t.title}</h1>
        ) : (
          <div className="flex w-full flex-col gap-2">
            <h1 className="type-h1 md:text-[44px] md:leading-[48px]">
              One block at a <em>time</em>
            </h1>
            <label htmlFor="focus-task" className="sr-only">
              What are you working on? (optional)
            </label>
            <input
              id="focus-task"
              value={t.customTitle}
              onChange={(e) => t.setCustomTitle(e.target.value)}
              placeholder="What are you working on? (optional)"
              className="mx-auto mt-2 min-h-12 w-full max-w-sm rounded-sm border border-line bg-surface-glass px-4 text-center text-ink focus-ring placeholder:text-ink-muted"
            />
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-2">
          <h1 className="type-h1 md:text-[44px] md:leading-[48px]">
            {t.timer.kind === "long_break" ? (
              <>
                A longer <em>pause</em>
              </>
            ) : (
              <>
                Breathe, <em>stretch</em>, look away
              </>
            )}
          </h1>
          <Link
            href="/app/games"
            className="inline-flex min-h-11 items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
          >
            Or play something calm <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
          </Link>
        </div>
      )}

      {t.done ? (
        <SessionSummary />
      ) : (
        <>
          <ProgressRing
            value={flowing ? Math.min(1, shownMs / (60 * 60_000)) : progress(t.timer, t.now)}
            size={300}
            strokeWidth={8}
            label={`${kindLabel(t.timer.kind)} timer`}
            valueText={flowing ? `${clock} focused` : `${clock} remaining`}
            className="max-w-full"
          >
            <span className="flex flex-col items-center">
              <span className="type-timer" aria-hidden="true">
                {clock}
              </span>
              <span className="type-body-sm text-ink-muted">
                {flowing
                  ? "flowing · tap Done when you pause"
                  : `of ${Math.round(t.timer.durationMs / 60000)} minutes`}
              </span>
            </span>
          </ProgressRing>

          <LapDots laps={t.laps} completed={t.timer.completedFocus} current={isFocus} />

          {t.awaitingCheck ? (
            <BlockCheck
              onDone={() => t.finishFocus("done")}
              onMore={() => t.finishFocus("more_time")}
              onStuck={() => setStuckOpen(true)}
            />
          ) : null}

          {stuckOpen ? (
            <StuckPanel
              taskTitle={t.title ?? "this task"}
              onClose={() => setStuckOpen(false)}
              onUseStep={async (step) => {
                await t.useStep(step);
                setStuckOpen(false);
              }}
              onSkipTask={
                t.currentTask
                  ? async () => {
                      await t.skipCurrentTask();
                      setStuckOpen(false);
                    }
                  : undefined
              }
            />
          ) : !t.awaitingCheck ? (
            <>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-pill"
                  disabled={!isFocus}
                  onClick={() => {
                    t.pauseForStuck();
                    setStuckOpen(true);
                  }}
                >
                  I&apos;m stuck
                </Button>
                <button
                  type="button"
                  onClick={t.playPause}
                  aria-label={
                    t.timer.status === "running"
                      ? "Pause"
                      : t.timer.status === "paused"
                        ? "Resume"
                        : `Start ${kindLabel(t.timer.kind).toLowerCase()}`
                  }
                  className="flex size-[72px] shrink-0 items-center justify-center rounded-pill text-on-brand bg-gradient-primary focus-ring transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100"
                >
                  {t.timer.status === "running" ? (
                    <Pause className="size-7 fill-current stroke-[1.5]" aria-hidden="true" />
                  ) : (
                    <Play className="size-7 translate-x-0.5 fill-current stroke-[1.5]" aria-hidden="true" />
                  )}
                </button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-pill"
                  disabled={!isFocus || t.timer.status === "idle"}
                  onClick={() => t.finishFocus("done")}
                >
                  Done
                </Button>
              </div>
              <p className="type-body-sm text-ink-muted">{nextLabel}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={t.skip}>
                  <SkipForward aria-hidden="true" /> Skip {isFocus ? "block" : "break"}
                </Button>
                <Button variant="ghost" size="sm" onClick={t.reset} disabled={t.timer.status === "idle"}>
                  <RotateCcw aria-hidden="true" /> Reset
                </Button>
              </div>
            </>
          ) : null}
        </>
      )}

      <p role="status" className="min-h-5 type-body-sm text-ink">
        {t.lastNotice}
      </p>

      {setup ? <SessionSetup hasPlan={!!t.plan} /> : null}

      {t.plan && t.plan.tasks.length > 0 ? (
        <PlanList tasks={t.plan.tasks} currentId={t.currentTask?.id ?? null} />
      ) : null}
    </div>
  );
}

/** One dot per lap: filled when done, ringed for the current lap. */
function LapDots({ laps, completed, current }: { laps: number; completed: number; current: boolean }) {
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`${completed} of ${laps} laps done`}>
      {Array.from({ length: laps }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2.5 rounded-pill transition-colors duration-500",
            i < completed ? "[background:var(--gradient-primary)]" : "bg-track",
            i === completed && current && "ring-2 ring-blue-soft ring-offset-2 ring-offset-surface",
          )}
        />
      ))}
    </div>
  );
}

function SessionSetup({ hasPlan }: { hasPlan: boolean }) {
  const t = useTimer();
  const tech = getTechnique(t.technique);
  const minuteOptions = (from: number, to: number, step: number) =>
    Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);
  const notifySupported = useSyncExternalStore(
    () => () => {},
    () => typeof Notification !== "undefined",
    () => false,
  );

  return (
    <GlassCard className="flex w-full flex-col gap-5 p-5 text-left md:p-6">
      <div className="flex flex-col gap-3">
        <h2 id="technique-label" className="type-h3">
          Technique
        </h2>
        <ChipGroup
          type="single"
          aria-labelledby="technique-label"
          aria-describedby="technique-summary"
          options={TECHNIQUES.map((x) => ({ value: x.id, label: x.name }))}
          value={t.technique}
          onValueChange={(v) => t.setTechnique(v)}
        />
        <p id="technique-summary" className="type-body-sm text-ink-muted">
          {tech.summary}
          {hasPlan && !tech.openEnded ? " With a plan, each block matches its task's estimate." : ""}
        </p>
      </div>

      {t.technique === "custom" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["focusMinutes", "Focus", minuteOptions(5, 180, 5)],
              ["shortBreakMinutes", "Break", minuteOptions(1, 30, 1)],
              ["longBreakMinutes", "Long break", minuteOptions(5, 60, 5)],
              ["longBreakEvery", "Long break every", minuteOptions(2, 8, 1)],
            ] as const
          ).map(([key, label, options]) => (
            <label key={key} className="flex flex-col gap-1 type-body-sm">
              {label}
              <select
                value={t.custom[key]}
                onChange={(e) => t.setCustom({ [key]: Number(e.target.value) })}
                className="min-h-11 rounded-sm border border-line bg-surface-deep px-2 text-ink focus-ring"
              >
                {options.map((o) => (
                  <option key={o} value={o}>
                    {key === "longBreakEvery" ? `${o} laps` : `${o} min`}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 id="laps-label" className="type-h3">
            Laps
          </h2>
          <p className="type-body-sm text-ink-muted">How many focus blocks in this session.</p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-labelledby="laps-label">
          <Button
            size="icon"
            variant="secondary"
            aria-label="Fewer laps"
            disabled={t.laps <= 1}
            onClick={() => t.setLaps(t.laps - 1)}
          >
            <Minus aria-hidden="true" />
          </Button>
          <output
            className="w-8 text-center text-2xl font-light tabular-nums"
            aria-live="polite"
            aria-label={`${t.laps} laps`}
          >
            {t.laps}
          </output>
          <Button
            size="icon"
            variant="secondary"
            aria-label="More laps"
            disabled={t.laps >= 12}
            onClick={() => t.setLaps(t.laps + 1)}
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>
      </div>

      {notifySupported ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          aria-pressed={t.notify}
          onClick={() => t.setNotify(!t.notify)}
        >
          {t.notify ? <Bell aria-hidden="true" /> : <BellOff aria-hidden="true" />}
          {t.notify ? "Notifications on when a block ends" : "Notify me when a block ends"}
        </Button>
      ) : null}
    </GlassCard>
  );
}

function SessionSummary() {
  const t = useTimer();
  const doneTasks = t.plan?.tasks.filter((x) => x.status === "done").length ?? 0;
  return (
    <GlassCard className="flex w-full flex-col items-center gap-4 p-6">
      <LapDots laps={t.laps} completed={t.laps} current={false} />
      <p className="type-h2">
        {t.laps} {t.laps === 1 ? "lap" : "laps"} done
        {doneTasks ? `, ${doneTasks} ${doneTasks === 1 ? "task" : "tasks"} ticked off` : ""}.
      </p>
      <p className="text-ink-muted">Take a real break. Your day is saved in Review.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={t.newSession}>Start another session</Button>
        <Button asChild variant="secondary">
          <Link href="/app/review">See today in Review</Link>
        </Button>
      </div>
    </GlassCard>
  );
}

function BlockCheck({
  onDone,
  onMore,
  onStuck,
}: {
  onDone: () => void;
  onMore: () => void;
  onStuck: () => void;
}) {
  return (
    <GlassCard className="flex w-full flex-col gap-4 p-5" role="group" aria-labelledby="check-heading">
      <p id="check-heading" className="type-h2">
        Block finished. How did it go?
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <Button onClick={onDone} autoFocus>
          <Check aria-hidden="true" /> Done
        </Button>
        <Button variant="secondary" onClick={onMore}>
          Need more time
        </Button>
        <Button variant="secondary" onClick={onStuck}>
          I&apos;m stuck
        </Button>
      </div>
    </GlassCard>
  );
}

function StuckPanel({
  taskTitle,
  onClose,
  onUseStep,
  onSkipTask,
}: {
  taskTitle: string;
  onClose: () => void;
  onUseStep: (step: { title: string; minutes: number }) => void;
  onSkipTask?: () => void;
}) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof getUnstuck>> | null>(null);

  return (
    <GlassCard
      className="flex w-full flex-col gap-4 p-5 text-left"
      role="group"
      aria-labelledby="stuck-heading"
    >
      <LunaBadge />
      <p id="stuck-heading" className="type-h2">
        Let&apos;s make it smaller
      </p>
      {!result ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            setResult(await getUnstuck(taskTitle, note));
            setPending(false);
          }}
        >
          <label htmlFor="stuck-note" className="type-body-sm text-ink">
            What&apos;s in the way? (optional)
          </label>
          <textarea
            id="stuck-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={2}
            className="rounded-sm border border-line bg-surface-deep px-4 py-3 text-ink focus-ring"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? `${GUIDE_NAME} is thinking…` : `Ask ${GUIDE_NAME}`}
            </Button>
            {onSkipTask ? (
              <Button type="button" variant="ghost" onClick={onSkipTask}>
                Skip this task
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onClose}>
              Back
            </Button>
          </div>
        </form>
      ) : result.ok ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p className="font-display text-[24px] leading-7">{result.turn.reply}</p>
          <p className="rounded-md border border-line bg-surface-glass p-3">
            <span className="block type-body-sm text-ink-muted">
              Smaller next step · {result.turn.estimate_minutes} min
            </span>
            {result.turn.next_step}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                onUseStep({ title: result.turn.next_step, minutes: result.turn.estimate_minutes })
              }
            >
              Try this for {result.turn.estimate_minutes} min
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Back
            </Button>
          </div>
        </div>
      ) : result.support ? (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p>It sounds like this is about more than the task. Please reach out to someone you trust.</p>
          <Button asChild>
            <Link href="/app/support">See support options</Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3" aria-live="polite">
          <p>{result.message}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onUseStep({ title: `Rough first draft: ${taskTitle}`, minutes: 5 })}>
              Try 5 minutes
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Back
            </Button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

function PlanList({ tasks, currentId }: { tasks: FocusTask[]; currentId: string | null }) {
  return (
    <GlassCard className="flex w-full flex-col gap-3 p-5 text-left">
      <h2 className="type-h3">Today&apos;s plan</h2>
      <ol className="flex flex-col gap-2">
        {tasks.map((task, i) => (
          <li
            key={task.id}
            aria-current={task.id === currentId ? "step" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5",
              task.id === currentId ? "bg-white/[0.08]" : "",
              task.status !== "todo" && "text-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-pill border text-xs font-semibold",
                task.status === "done"
                  ? "border-transparent text-on-brand [background:var(--gradient-primary)]"
                  : "border-line",
              )}
            >
              {task.status === "done" ? <Check className="size-4" aria-label="Done" /> : i + 1}
            </span>
            <span className={cn("flex-1", task.status === "skipped" && "line-through")}>
              {task.title}
              {task.status === "skipped" ? <span className="sr-only"> (skipped)</span> : null}
            </span>
            <span className="type-body-sm text-ink-muted tabular-nums">{task.estimate_minutes} min</span>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}
