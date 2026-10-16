import { Grid3x3, Puzzle, Type, Wind, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { BreathingBubble } from "./breathing-bubble";
import { MemoryMatch } from "./memory-match";
import { WordOfTheDay } from "./word-of-the-day";
import { ZenTiles } from "./zen-tiles";

export type GameId = "breathing-bubble" | "memory-match" | "zen-tiles" | "word-of-the-day";

export const GAMES: {
  id: GameId;
  name: string;
  blurb: string;
  minutes: string;
  icon: LucideIcon;
  Component: ComponentType;
}[] = [
  {
    id: "breathing-bubble",
    name: "Breathing bubble",
    blurb: "Follow a slow bubble: in, hold, out.",
    minutes: "1–3 min",
    icon: Wind,
    Component: BreathingBubble,
  },
  {
    id: "memory-match",
    name: "Memory match",
    blurb: "Turn over cards and find the pairs.",
    minutes: "2–4 min",
    icon: Grid3x3,
    Component: MemoryMatch,
  },
  {
    id: "zen-tiles",
    name: "Zen tiles",
    blurb: "Slide eight soft tiles back into order.",
    minutes: "2–5 min",
    icon: Puzzle,
    Component: ZenTiles,
  },
  {
    id: "word-of-the-day",
    name: "Word of the day",
    blurb: "Guess one calm five-letter word.",
    minutes: "2–4 min",
    icon: Type,
    Component: WordOfTheDay,
  },
];

export function getGame(id: string) {
  return GAMES.find((g) => g.id === id) ?? null;
}
