import type { TimerSettings } from "./engine";

export type TechniqueId = "pomodoro" | "deep-work" | "ultradian" | "52-17" | "flowtime" | "custom";

export type Technique = {
  id: TechniqueId;
  name: string;
  /** One line, describing the rhythm (never promising outcomes). */
  summary: string;
  focus: number;
  shortBreak: number;
  longBreak: number;
  longEvery: number;
  /** Flowtime: focus as long as it flows (up to a cap); the break scales with the block. */
  openEnded?: boolean;
};

export const TECHNIQUES: readonly Technique[] = [
  {
    id: "pomodoro",
    name: "Pomodoro",
    summary: "25 minutes on, 5 off, a longer break every 4 laps.",
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    longEvery: 4,
  },
  {
    id: "deep-work",
    name: "Deep work",
    summary: "50-minute blocks with 10-minute breaks, for heads-down work.",
    focus: 50,
    shortBreak: 10,
    longBreak: 20,
    longEvery: 3,
  },
  {
    id: "ultradian",
    name: "Ultradian",
    summary: "Long 90-minute blocks, then a proper 20-minute rest.",
    focus: 90,
    shortBreak: 20,
    longBreak: 30,
    longEvery: 2,
  },
  {
    id: "52-17",
    name: "52 / 17",
    summary: "52 minutes of focus, 17 minutes fully away.",
    focus: 52,
    shortBreak: 17,
    longBreak: 17,
    longEvery: 4,
  },
  {
    id: "flowtime",
    name: "Flowtime",
    summary: "Work until you naturally pause; your break is a fifth of the block.",
    focus: 120,
    shortBreak: 5,
    longBreak: 15,
    longEvery: 4,
    openEnded: true,
  },
  {
    id: "custom",
    name: "Custom",
    summary: "Your own focus and break lengths.",
    focus: 25,
    shortBreak: 5,
    longBreak: 15,
    longEvery: 4,
  },
];

export function getTechnique(id: string | null | undefined): Technique {
  return TECHNIQUES.find((t) => t.id === id) ?? TECHNIQUES[0];
}

/** Engine settings for a technique; "custom" uses the user's saved lengths. */
export function settingsFor(
  id: TechniqueId,
  custom: {
    focusMinutes: number;
    shortBreakMinutes: number;
    longBreakMinutes: number;
    longBreakEvery: number;
  },
): TimerSettings {
  if (id === "custom") return { ...custom, openEnded: false };
  const t = getTechnique(id);
  return {
    focusMinutes: t.focus,
    shortBreakMinutes: t.shortBreak,
    longBreakMinutes: t.longBreak,
    longBreakEvery: t.longEvery,
    openEnded: !!t.openEnded,
  };
}
