"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import { MIXES, type Mix } from "@/lib/seed/mixes";

/**
 * Mock player state for the mini player slot. UI only: no audio.
 * TODO(player): replace with the real audio engine (Web Audio, binaural layer, background playback).
 */
type PlayerState = {
  track: Mix;
  isPlaying: boolean;
  binaural: boolean;
  play: (mix: Mix) => void;
  toggle: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<Mix>(MIXES[1]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [binaural] = useState(true);

  const value = useMemo<PlayerState>(
    () => ({
      track,
      isPlaying,
      binaural,
      play: (mix) => {
        setTrack(mix);
        setIsPlaying(true);
      },
      toggle: () => setIsPlaying((p) => !p),
    }),
    [track, isPlaying, binaural],
  );

  return <PlayerContext value={value}>{children}</PlayerContext>;
}

export function usePlayer() {
  const ctx = use(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}
