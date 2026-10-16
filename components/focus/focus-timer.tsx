"use client";

import Link from "next/link";
import { Check, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { finishFocusBlock, getUnstuck, skipTask, startFocusBlock } from "@/app/app/focus/actions";
import { ProgressRing } from "@/components/brand/progress-ring";
import { LunaBadge } from "@/components/luna/luna-badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { GUIDE_NAME } from "@/lib/config";
import {
  advance,
  createTimer,
  elapsedMs,
  formatClock,
  kindLabel,
  pause,
  progress,
  remainingMs,
  reset,
  start,
  tick,
  type TimerSettings,
  type TimerState,
} from "@/lib/timer/engine";
import { cn } from "@/lib/utils";
import { BreathingReset } from "./breathing-reset";
import { playChime, unlockAudio } from "./chime";

export type FocusTask = {
  id: string;
  title: string;
  estimate_minutes: number;
  status: "todo" | "done" | "skipped";
};
export type FocusPlan = { id: string; deadlineLabel: string | null; tasks: FocusTask[] };

type Props = {
  settings: TimerSettings;
  plan: FocusPlan | null;
  startWithReset: boolean;
};

type Sheet = null | "check" | "stuck";
/** An ad-hoc next step from "I'm stuck", used for the next focus block instead of the plan task. */
type Override = { title: string; minutes: number } | null;

const STORAGE_KEY = "focus-timer-v1";

type Persisted = {
  state: TimerState;
  blockId: string | null;
  planId: string | null;
  customTitle: string;
  override: Override;
};

function loadPersisted(planId: string | null): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    return p.planId === planId ? p : null;
  } catch {
    return null;
  }
}

export function FocusTimer({ settings, plan, startWithReset }: Props) {
  const [tasks, setTasks] = useState<FocusTask[]>(plan?.tasks ?? []);
  const [customTitle, setCustomTitle] = useState("");
  const [override, setOverride] = useState<Override>(null);
  const [showReset, setShowReset] = useState(startWithReset);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const blockIdRef = useRef<string | null>(null);

  const currentTask = tasks.find((t) => t.status === "todo") ?? null;
  const taskIndex = currentTask ? tasks.indexOf(currentTask) : tasks.length;

  // Focus length follows the current task's estimate (or the "stuck" next step), else the user's default.
  const blockSettings = useMemo<TimerSettings>(
    () => ({
      ...settings,
      focusMinutes: override?.minutes ?? currentTask?.estimate_minutes ?? settings.focusMinutes,
    }),
    [settings, override, currentTask],
  );

  const [state, setState] = useState<TimerState>(() => createTimer(blockSettings));

  // Restore an in-progress timer after a reload (per-browser convenience only).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const saved = loadPersisted(plan?.id ?? null);
    if (saved) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage */
      setState(saved.state);
      setCustomTitle(saved.customTitle);
      setOverride(saved.override);
      /* eslint-enable react-hooks/set-state-in-effect */
      blockIdRef.current = saved.blockId;
    }
  }, [plan?.id]);

  useEffect(() => {
    try {
      const data: Persisted = {
        state,
        blockId: blockIdRef.current,
        planId: plan?.id ?? null,
        customTitle,
        override,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // storage unavailable: the timer still works for this page view
    }
  }, [state, customTitle, override, plan?.id]);

  // When idle, keep the block length in sync with the current task.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived reset while idle
    setState((s) =>
      s.status === "idle" && s.kind === "focus" ? createTimer(blockSettings, "focus", s.completedFocus) : s,
    );
  }, [blockSettings]);

  const title = override?.title ?? currentTask?.title ?? (customTitle.trim() || null);

  const closeBlock = useCallback(
    async (
      outcome: "done" | "more_time" | "stuck" | "skipped" | "reset",
      completed: boolean,
      focusedMs: number,
    ) => {
      const id = blockIdRef.current;
      blockIdRef.current = null;
      if (!id) return;
      await finishFocusBlock({ id, focusedSeconds: Math.round(focusedMs / 1000), outcome, completed });
    },
    [],
  );

  // Ticking: derive everything from timestamps; also re-check when the tab becomes visible.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state.status !== "running") return;
    const update = () => {
      const t = Date.now();
      setNow(t);
      const s = stateRef.current;
      const next = tick(s, t);
      if (next === s) return;
      setState(next);
      if (next.status === "finished") {
        playChime();
        if (s.kind === "focus") setSheet("check");
      }
    };
    const id = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, [state.status]);

  // Breaks roll straight into a ready (idle) focus block when they end.
  useEffect(() => {
    if (state.status === "finished" && state.kind !== "focus") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- transition after a break ends
      setState((s) => advance(s, blockSettings));
    }
  }, [state.status, state.kind, blockSettings]);

  const remaining = remainingMs(state, now);
  const clock = formatClock(remaining);

  useEffect(() => {
    document.title =
      state.status === "running" || state.status === "paused"
        ? `${clock} · ${kindLabel(state.kind)}`
        : "Focus";
    return () => {
      document.title = "Focus";
    };
  }, [clock, state.status, state.kind]);

  const onPlayPause = async () => {
    unlockAudio();
    const t = Date.now();
    setNow(t);
    if (state.status === "running") {
      setState(pause(state, t));
      return;
    }
    const wasIdle = state.status === "idle";
    setState(start(state, t));
    if (wasIdle && state.kind === "focus") {
      const res = await startFocusBlock({
        taskId: override ? null : (currentTask?.id ?? null),
        taskTitle: title,
        plannedMinutes: blockSettings.focusMinutes,
      });
      if ("id" in res) blockIdRef.current = res.id;
      else setNotice(res.error);
    }
  };

  /** Ends the focus block and moves to its break. */
  const finishFocus = async (outcome: "done" | "more_time") => {
    const focused = elapsedMs(state, Date.now());
    setSheet(null);
    await closeBlock(outcome, true, focused);
    if (outcome === "done") {
      if (override) setOverride(null);
      else if (currentTask)
        setTasks((ts) => ts.map((t) => (t.id === currentTask.id ? { ...t, status: "done" } : t)));
    }
    setState((s) => advance(s, blockSettings));
    setNotice(
      outcome === "done"
        ? `${state.completedFocus + 1} ${state.completedFocus === 0 ? "block" : "blocks"} done. Nice work.`
        : null,
    );
  };

  const onSkip = async () => {
    const focused = elapsedMs(state, Date.now());
    if (state.kind === "focus") await closeBlock("skipped", false, focused);
    setSheet(null);
    setState((s) => advance(s, blockSettings, false));
  };

  const onReset = async () => {
    const focused = elapsedMs(state, Date.now());
    if (state.kind === "focus" && state.status !== "idle") await closeBlock("reset", false, focused);
    setSheet(null);
    setState((s) => reset(s, blockSettings));
  };

  const onSkipTask = async () => {
    if (!currentTask) return;
    await skipTask(currentTask.id);
    setTasks((ts) => ts.map((t) => (t.id === currentTask.id ? { ...t, status: "skipped" } : t)));
    setSheet(null);
  };

  const isFocus = state.kind === "focus";
  const nextTask = tasks.filter((t) => t.status === "todo")[override ? 0 : 1];
  const nextLabel = isFocus
    ? `Next: ${state.completedFocus + 1 > 0 && (state.completedFocus + 1) % settings.longBreakEvery === 0 ? `${settings.longBreakMinutes}-minute long break` : `${settings.shortBreakMinutes}-minute break`}${nextTask ? `, then ${nextTask.title.charAt(0).toLowerCase()}${nextTask.title.slice(1)}` : ""}`
    : `Next: ${title ?? "your next focus block"}`;
  const allDone = plan && tasks.length > 0 && !currentTask && !override;

  if (showReset) return <BreathingReset onDone={() => setShowReset(false)} />;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <p className="type-body-sm text-ink-muted">
        {plan && currentTask
          ? `Block ${taskIndex + 1} of ${tasks.length}${plan.deadlineLabel ? ` · due ${plan.deadlineLabel}` : ""}`
          : isFocus
            ? "Focus block"
            : kindLabel(state.kind)}
      </p>

      {allDone ? (
        <h1 className="type-h1 md:text-[48px] md:leading-[52px]">
          Plan <em>complete</em>
        </h1>
      ) : isFocus ? (
        title && (currentTask || override || state.status !== "idle") ? (
          <h1 className="type-h1 md:text-[44px] md:leading-[48px]">{title}</h1>
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
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value.slice(0, 200))}
              placeholder="What are you working on? (optional)"
              className="mx-auto mt-2 min-h-12 w-full max-w-sm rounded-sm border border-line bg-surface-glass px-4 text-center text-ink focus-ring placeholder:text-ink-muted"
            />
          </div>
        )
      ) : (
        <h1 className="type-h1 md:text-[44px] md:leading-[48px]">
          {state.kind === "long_break" ? (
            <>
              A longer <em>pause</em>
            </>
          ) : (
            <>
              Breathe, <em>stretch</em>, look away
            </>
          )}
        </h1>
      )}

      {allDone ? (
        <GlassCard className="flex w-full flex-col items-center gap-4 p-6">
          <p className="type-h2">Every task is done. Lovely work.</p>
          <p className="text-ink-muted">How did today go? Take a moment before the next thing.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href="/app">Back to home</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/app/check-in">New check-in</Link>
            </Button>
          </div>
        </GlassCard>
      ) : (
        <>
          <ProgressRing
            value={progress(state, now)}
            size={300}
            strokeWidth={8}
            label={`${kindLabel(state.kind)} timer`}
            valueText={`${clock} remaining`}
            className="max-w-full"
          >
            <span className="flex flex-col items-center">
              <span className="type-timer" aria-hidden="true">
                {clock}
              </span>
              <span className="type-body-sm text-ink-muted">
                of {Math.round(state.durationMs / 60000)} minutes
              </span>
            </span>
          </ProgressRing>

          {sheet === "check" ? (
            <BlockCheck
              onDone={() => finishFocus("done")}
              onMore={() => finishFocus("more_time")}
              onStuck={() => setSheet("stuck")}
            />
          ) : sheet === "stuck" ? (
            <StuckPanel
              taskTitle={title ?? "this task"}
              onClose={() => setSheet(state.status === "finished" ? "check" : null)}
              onUseStep={async (step) => {
                const focused = elapsedMs(state, Date.now());
                if (state.kind === "focus" && state.status !== "idle")
                  await closeBlock("stuck", state.status === "finished", focused);
                setOverride(step);
                setSheet(null);
                setState(
                  createTimer({ ...settings, focusMinutes: step.minutes }, "focus", state.completedFocus),
                );
              }}
              onSkipTask={currentTask && !override ? onSkipTask : undefined}
            />
          ) : (
            <>
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-pill"
                  disabled={!isFocus}
                  onClick={() => {
                    if (state.status === "running") setState(pause(state, Date.now()));
                    setSheet("stuck");
                  }}
                >
                  I&apos;m stuck
                </Button>
                <button
                  type="button"
                  onClick={onPlayPause}
                  aria-label={
                    state.status === "running"
                      ? "Pause"
                      : state.status === "paused"
                        ? "Resume"
                        : `Start ${kindLabel(state.kind).toLowerCase()}`
                  }
                  className="flex size-[72px] shrink-0 items-center justify-center rounded-pill text-on-brand bg-gradient-primary focus-ring transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100"
                >
                  {state.status === "running" ? (
                    <Pause className="size-7 fill-current stroke-[1.5]" aria-hidden="true" />
                  ) : (
                    <Play className="size-7 translate-x-0.5 fill-current stroke-[1.5]" aria-hidden="true" />
                  )}
                </button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="rounded-pill"
                  disabled={!isFocus || state.status === "idle"}
                  onClick={() => finishFocus("done")}
                >
                  Done
                </Button>
              </div>
              <p className="type-body-sm text-ink-muted">{nextLabel}</p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onSkip}>
                  <SkipForward aria-hidden="true" /> Skip {isFocus ? "block" : "break"}
                </Button>
                <Button variant="ghost" size="sm" onClick={onReset} disabled={state.status === "idle"}>
                  <RotateCcw aria-hidden="true" /> Reset
                </Button>
              </div>
            </>
          )}
        </>
      )}

      <p role="status" className="min-h-5 type-body-sm text-ink">
        {notice}
      </p>

      {plan && tasks.length > 0 ? (
        <PlanList tasks={tasks} currentId={override ? null : (currentTask?.id ?? null)} />
      ) : null}
    </div>
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
        {tasks.map((t, i) => (
          <li
            key={t.id}
            aria-current={t.id === currentId ? "step" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5",
              t.id === currentId ? "bg-white/[0.08]" : "",
              t.status !== "todo" && "text-ink-muted",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-pill border text-xs font-semibold",
                t.status === "done"
                  ? "border-transparent text-on-brand [background:var(--gradient-primary)]"
                  : "border-line",
              )}
            >
              {t.status === "done" ? <Check className="size-4" aria-label="Done" /> : i + 1}
            </span>
            <span className={cn("flex-1", t.status === "skipped" && "line-through")}>
              {t.title}
              {t.status === "skipped" ? <span className="sr-only"> (skipped)</span> : null}
            </span>
            <span className="type-body-sm text-ink-muted tabular-nums">{t.estimate_minutes} min</span>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}
