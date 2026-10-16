"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { finishFocusBlock, saveFocusPreferences, skipTask, startFocusBlock } from "@/app/app/focus/actions";
import {
  advance,
  createTimer,
  currentLap,
  DEFAULT_SETTINGS,
  elapsedMs,
  pause as pauseTimer,
  reset as resetTimer,
  sessionComplete,
  start as startTimer,
  tick,
  type TimerSettings,
  type TimerState,
} from "@/lib/timer/engine";
import { getTechnique, settingsFor, type TechniqueId } from "@/lib/timer/techniques";
import { playChime, unlockAudio } from "./chime";

export type FocusTask = {
  id: string;
  title: string;
  estimate_minutes: number;
  status: "todo" | "done" | "skipped";
};
export type FocusPlan = { id: string; deadlineLabel: string | null; tasks: FocusTask[] };
export type CustomLengths = {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
};
type Override = { title: string; minutes: number } | null;
export type Outcome = "done" | "more_time" | "stuck" | "skipped" | "reset";

type Session = {
  timer: TimerState;
  technique: TechniqueId;
  custom: CustomLengths;
  laps: number;
  plan: FocusPlan | null;
  override: Override;
  customTitle: string;
  blockId: string | null;
  awaitingCheck: boolean;
  notify: boolean;
};

type TimerContextValue = Session & {
  now: number;
  /** Engine settings for the current block (technique, plus task estimate or "stuck" step). */
  settings: TimerSettings;
  currentTask: FocusTask | null;
  title: string | null;
  lap: number;
  done: boolean;
  /** A session is underway (a block has started, or the session has laps behind it). */
  active: boolean;
  lastNotice: string | null;
  init: (cfg: {
    technique: TechniqueId;
    laps: number;
    custom: CustomLengths;
    plan: FocusPlan | null;
  }) => void;
  setTechnique: (t: TechniqueId) => void;
  setLaps: (n: number) => void;
  setCustom: (c: Partial<CustomLengths>) => void;
  setCustomTitle: (t: string) => void;
  setNotify: (v: boolean) => void;
  playPause: () => void;
  finishFocus: (outcome: "done" | "more_time") => Promise<void>;
  skip: () => Promise<void>;
  reset: () => Promise<void>;
  useStep: (step: { title: string; minutes: number }) => Promise<void>;
  skipCurrentTask: () => Promise<void>;
  newSession: () => void;
  pauseForStuck: () => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);
const STORAGE_KEY = "focus-session-v2";

const DEFAULT_CUSTOM: CustomLengths = {
  focusMinutes: DEFAULT_SETTINGS.focusMinutes,
  shortBreakMinutes: DEFAULT_SETTINGS.shortBreakMinutes,
  longBreakMinutes: DEFAULT_SETTINGS.longBreakMinutes,
  longBreakEvery: DEFAULT_SETTINGS.longBreakEvery,
};

function initialSession(): Session {
  return {
    timer: createTimer(DEFAULT_SETTINGS),
    technique: "pomodoro",
    custom: DEFAULT_CUSTOM,
    laps: 4,
    plan: null,
    override: null,
    customTitle: "",
    blockId: null,
    awaitingCheck: false,
    notify: false,
  };
}

function computeSettings(
  s: Pick<Session, "technique" | "custom" | "override" | "plan">,
  task: FocusTask | null,
): TimerSettings {
  const base = settingsFor(s.technique, s.custom);
  if (s.override) return { ...base, focusMinutes: s.override.minutes, openEnded: false };
  if (task && !base.openEnded) return { ...base, focusMinutes: task.estimate_minutes };
  return base;
}

const firstTodo = (plan: FocusPlan | null) => plan?.tasks.find((t) => t.status === "todo") ?? null;

function notifyUser(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      new Notification(title, { body, tag: "focus-timer" });
    }
  } catch {
    // Notifications unsupported: the chime and banner still signal the change.
  }
}

export function TimerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(initialSession);
  // 0 until mounted: reading the clock during render would differ between server and client.
  const [now, setNow] = useState(0);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock after hydration
    setNow(Date.now());
  }, []);
  const [lastNotice, setLastNotice] = useState<string | null>(null);
  const hydrated = useRef(false);
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Restore after reloads and across tabs of the same browser (convenience only).
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
      if (raw) setSession({ ...initialSession(), ...(JSON.parse(raw) as Session) });
    } catch {
      // ignore corrupt storage
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // storage unavailable
    }
  }, [session]);

  const currentTask = session.override ? null : firstTodo(session.plan);
  const settings = useMemo(() => computeSettings(session, currentTask), [session, currentTask]);
  const done =
    sessionComplete(session.timer, session.laps) &&
    session.timer.status !== "running" &&
    !session.awaitingCheck;
  const active = session.timer.status !== "idle" || session.timer.completedFocus > 0 || session.awaitingCheck;

  // Ticking lives here so the timer keeps going on every page.
  useEffect(() => {
    if (session.timer.status !== "running") return;
    const update = () => {
      const t = Date.now();
      setNow(t);
      const s = sessionRef.current;
      const next = tick(s.timer, t);
      if (next === s.timer) return;
      if (next.status === "finished") {
        playChime();
        if (s.timer.kind === "focus") {
          setSession({ ...s, timer: next, awaitingCheck: true });
          if (s.notify) notifyUser("Block finished", "How did it go? Open the timer to check in.");
        } else {
          const settingsNow = computeSettings(s, s.override ? null : firstTodo(s.plan));
          setSession({ ...s, timer: advance(next, settingsNow, true, t) });
          if (s.notify) notifyUser("Break's over", "Ready for the next lap when you are.");
        }
      } else {
        setSession({ ...s, timer: next });
      }
    };
    const id = window.setInterval(update, 250);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, [session.timer.status]);

  // The start of the current block is saved in the background; closing waits for it if needed.
  const pendingStart = useRef<Promise<string | null> | null>(null);

  const closeBlock = useCallback(
    async (blockId: string | null, outcome: Outcome, completed: boolean, focusedMs: number) => {
      const pending = pendingStart.current;
      pendingStart.current = null;
      const id = blockId ?? (pending ? await pending : null);
      if (!id) return;
      await finishFocusBlock({
        id,
        focusedSeconds: Math.round(focusedMs / 1000),
        outcome,
        completed,
      });
    },
    [],
  );

  // Debounced so quick taps (e.g. laps − −) save only the final value, never out of order.
  const saveTimer = useRef<number | null>(null);
  const savePrefs = (technique: TechniqueId, laps: number, custom: CustomLengths) => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(
      () => void saveFocusPreferences({ technique, laps, ...custom }),
      600,
    );
  };

  const value: TimerContextValue = {
    ...session,
    now,
    settings,
    currentTask,
    title: session.override?.title ?? currentTask?.title ?? (session.customTitle.trim() || null),
    lap: currentLap(session.timer, session.laps),
    done,
    active,
    lastNotice,

    init: ({ technique, laps, custom, plan }) =>
      setSession((s) => {
        const idle = s.timer.status === "idle" && s.timer.completedFocus === 0 && !s.awaitingCheck;
        // Keep a running session untouched, except to refresh the same plan's tasks.
        if (!idle)
          return plan && s.plan?.id === plan.id
            ? { ...s, plan: { ...plan, tasks: mergeTasks(s.plan.tasks, plan.tasks) } }
            : s;
        const next = {
          ...s,
          technique,
          custom,
          plan,
          laps: plan ? Math.max(1, plan.tasks.filter((t) => t.status === "todo").length) : laps,
          override: null,
        };
        return { ...next, timer: createTimer(computeSettings(next, firstTodo(plan))) };
      }),

    setTechnique: (technique) => {
      const s = sessionRef.current;
      const next = { ...s, technique };
      setSession(
        s.timer.status === "idle"
          ? {
              ...next,
              timer: createTimer(computeSettings(next, currentTask), s.timer.kind, s.timer.completedFocus),
            }
          : next,
      );
      savePrefs(technique, s.laps, s.custom);
    },

    setLaps: (laps) => {
      const s = sessionRef.current;
      const n = Math.min(12, Math.max(1, laps));
      setSession({ ...s, laps: n });
      savePrefs(s.technique, n, s.custom);
    },

    setCustom: (patch) => {
      const s = sessionRef.current;
      const custom = { ...s.custom, ...patch };
      const next = { ...s, custom };
      setSession(
        s.timer.status === "idle"
          ? {
              ...next,
              timer: createTimer(computeSettings(next, currentTask), s.timer.kind, s.timer.completedFocus),
            }
          : next,
      );
      savePrefs(s.technique, s.laps, custom);
    },

    setCustomTitle: (customTitle) => setSession((s) => ({ ...s, customTitle: customTitle.slice(0, 200) })),

    setNotify: (notify) => {
      if (notify && typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission().then((p) =>
          setSession((s) => ({ ...s, notify: p === "granted" })),
        );
        return;
      }
      setSession((s) => ({ ...s, notify }));
    },

    playPause: () => {
      unlockAudio();
      const t = Date.now();
      setNow(t);
      const s = sessionRef.current;
      if (s.timer.status === "running") {
        setSession({ ...s, timer: pauseTimer(s.timer, t) });
        return;
      }
      if (done) return;
      const wasIdle = s.timer.status === "idle";
      // Keep the block length in sync with the task / technique right before starting.
      const fresh = wasIdle ? { ...createTimer(settings, s.timer.kind, s.timer.completedFocus) } : s.timer;
      setSession({ ...s, timer: startTimer(fresh, t) });
      if (wasIdle && s.timer.kind === "focus") {
        const started: Promise<string | null> = startFocusBlock({
          taskId: s.override ? null : (currentTask?.id ?? null),
          taskTitle: s.override?.title ?? currentTask?.title ?? (s.customTitle.trim() || null),
          plannedMinutes: settings.focusMinutes,
          technique: s.technique,
          lap: currentLap(s.timer, s.laps),
        }).then((res) => {
          if ("id" in res) {
            // Only attach the id if this block is still the open one (it may already have closed).
            if (pendingStart.current === started) setSession((cur) => ({ ...cur, blockId: res.id }));
            return res.id;
          }
          setLastNotice(res.error);
          return null;
        });
        pendingStart.current = started;
      }
    },

    finishFocus: async (outcome) => {
      const s = sessionRef.current;
      const t = Date.now();
      const focused = elapsedMs(s.timer, t);
      await closeBlock(s.blockId, outcome, true, focused);
      let plan = s.plan;
      let override = s.override;
      if (outcome === "done") {
        if (override) override = null;
        else if (currentTask && plan)
          plan = {
            ...plan,
            tasks: plan.tasks.map((x) => (x.id === currentTask.id ? { ...x, status: "done" } : x)),
          };
      }
      const completed = s.timer.completedFocus + 1;
      const next = { ...s, plan, override, blockId: null, awaitingCheck: false };
      const nextSettings = computeSettings(next, override ? null : firstTodo(plan));
      const timer =
        completed >= s.laps
          ? { ...createTimer(nextSettings, "focus", completed), status: "finished" as const }
          : advance(s.timer, nextSettings, true, t);
      setSession({ ...next, timer });
      setLastNotice(
        completed >= s.laps
          ? `All ${s.laps} ${s.laps === 1 ? "lap" : "laps"} done. Lovely work.`
          : `${completed} ${completed === 1 ? "lap" : "laps"} done. Nice work.`,
      );
    },

    skip: async () => {
      const s = sessionRef.current;
      const t = Date.now();
      if (s.timer.kind === "focus") await closeBlock(s.blockId, "skipped", false, elapsedMs(s.timer, t));
      setSession({ ...s, blockId: null, awaitingCheck: false, timer: advance(s.timer, settings, false, t) });
    },

    reset: async () => {
      const s = sessionRef.current;
      if (s.timer.kind === "focus" && s.timer.status !== "idle")
        await closeBlock(s.blockId, "reset", false, elapsedMs(s.timer, Date.now()));
      setSession({ ...s, blockId: null, awaitingCheck: false, timer: resetTimer(s.timer, settings) });
    },

    useStep: async (step) => {
      const s = sessionRef.current;
      if (s.timer.kind === "focus" && s.timer.status !== "idle") {
        await closeBlock(s.blockId, "stuck", s.timer.status === "finished", elapsedMs(s.timer, Date.now()));
      }
      const next = { ...s, override: step, blockId: null, awaitingCheck: false };
      setSession({
        ...next,
        timer: createTimer(computeSettings(next, null), "focus", s.timer.completedFocus),
      });
    },

    skipCurrentTask: async () => {
      const s = sessionRef.current;
      if (!currentTask || !s.plan) return;
      await skipTask(currentTask.id);
      setSession({
        ...s,
        plan: {
          ...s.plan,
          tasks: s.plan.tasks.map((x) => (x.id === currentTask.id ? { ...x, status: "skipped" } : x)),
        },
      });
    },

    newSession: () =>
      setSession((s) => {
        const next = { ...s, override: null, blockId: null, awaitingCheck: false, customTitle: "" };
        return { ...next, timer: createTimer(computeSettings(next, firstTodo(s.plan))) };
      }),

    pauseForStuck: () =>
      setSession((s) =>
        s.timer.status === "running" ? { ...s, timer: pauseTimer(s.timer, Date.now()) } : s,
      ),
  };

  return <TimerContext value={value}>{children}</TimerContext>;
}

/** Keeps local progress (done/skipped) when the server copy of the same plan reloads. */
function mergeTasks(local: FocusTask[], server: FocusTask[]) {
  return server.map((t) => {
    const l = local.find((x) => x.id === t.id);
    return l && l.status !== "todo" ? { ...t, status: l.status } : t;
  });
}

export function useTimer() {
  const ctx = use(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside TimerProvider");
  return ctx;
}

export function techniqueLabel(id: TechniqueId) {
  return getTechnique(id).name;
}
