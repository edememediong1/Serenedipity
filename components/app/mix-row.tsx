"use client";

import { Pause, Play } from "lucide-react";
import {
  categoryLabel,
  playlistMinutes,
  STATE_LABELS,
  type MoodState,
  type Playlist,
} from "@/lib/music/types";
import { cn } from "@/lib/utils";
import { usePlayer } from "./player-context";

export const PLAYLIST_ART: Record<MoodState, string> = {
  focus: "bg-state-focus",
  calm: "bg-gradient-orb",
  clear: "bg-state-clear",
};

/** "Picked for you": horizontal scroll on mobile, grid from md. Play starts the playlist in the app-wide player. */
export function MixRow({ playlists }: { playlists: readonly Playlist[] }) {
  const { playPlaylist, toggle, playlist: current, isPlaying } = usePlayer();
  return (
    <ul className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
      {playlists.map((p) => {
        const playing = current?.id === p.id && isPlaying;
        return (
          <li key={p.id} className="w-[85%] shrink-0 snap-start md:w-auto">
            <div className="flex items-center gap-3 rounded-lg p-3 pr-4 glass">
              <span
                aria-hidden="true"
                className={cn(
                  PLAYLIST_ART[p.state as MoodState] ?? "bg-gradient-orb",
                  "size-16 shrink-0 rounded-sm",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="type-body-sm text-ink-muted">{categoryLabel(p.category)}</p>
                <p className="truncate font-display text-[22px] leading-7">{p.title}</p>
                <p className="type-body-sm text-ink-muted">
                  {STATE_LABELS[p.state as MoodState] ?? p.state} · {p.tracks.length} tracks ·{" "}
                  {playlistMinutes(p)} min
                </p>
              </div>
              <button
                type="button"
                onClick={() => (current?.id === p.id ? toggle() : playPlaylist(p))}
                aria-label={playing ? `Pause ${p.title}` : `Play ${p.title}`}
                aria-pressed={playing}
                className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-ink text-surface focus-ring transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100"
              >
                {playing ? (
                  <Pause className="size-5 fill-current stroke-[1.5]" aria-hidden="true" />
                ) : (
                  <Play className="size-5 translate-x-px fill-current stroke-[1.5]" aria-hidden="true" />
                )}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
