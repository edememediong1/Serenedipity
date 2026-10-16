"use client";

import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { PLAYLIST_ART } from "@/components/app/mix-row";
import { usePlayer } from "@/components/app/player-context";
import { ChipGroup } from "@/components/ui/chip";
import {
  categoryLabel,
  formatDuration,
  playlistMinutes,
  STATE_LABELS,
  STYLE_LABELS,
  type MoodState,
  type MusicTrack,
  type Playlist,
} from "@/lib/music/types";
import { cn } from "@/lib/utils";

type Filter = "all" | MoodState;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Everything" },
  { value: "focus", label: "Focus" },
  { value: "calm", label: "Calm" },
  { value: "clear", label: "Clear" },
];

// Categories that belong to each state, for filtering single tracks.
const STATE_CATEGORIES: Record<MoodState, string[]> = {
  focus: ["deep-focus"],
  calm: ["calm-mind", "wind-down"],
  clear: ["clear-the-fog", "creative-flow"],
};

function PlayButton({
  playing,
  label,
  onClick,
  small,
}: {
  playing: boolean;
  label: string;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={playing ? `Pause ${label}` : `Play ${label}`}
      aria-pressed={playing}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-pill focus-ring transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100",
        small ? "size-11 bg-white/[0.08] text-ink" : "size-12 bg-ink text-surface",
      )}
    >
      {playing ? (
        <Pause className="size-5 fill-current stroke-[1.5]" aria-hidden="true" />
      ) : (
        <Play className="size-5 translate-x-px fill-current stroke-[1.5]" aria-hidden="true" />
      )}
    </button>
  );
}

/** The music library: playlists by state, each with its tracks, plus every track on its own. */
export function MusicLibrary({
  playlists,
  tracks,
  initialFilter,
}: {
  playlists: Playlist[];
  tracks: MusicTrack[];
  initialFilter: Filter;
}) {
  const player = usePlayer();
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const shownPlaylists = filter === "all" ? playlists : playlists.filter((p) => p.state === filter);
  const shownTracks =
    filter === "all" ? tracks : tracks.filter((t) => STATE_CATEGORIES[filter].includes(t.category));

  const isCurrent = (p: Playlist, i?: number) =>
    player.playlist?.id === p.id && (i === undefined || player.index === i);
  const press = (p: Playlist, i = 0) => (isCurrent(p, i) ? player.toggle() : player.playPlaylist(p, i));

  // A single track plays as a one-track queue named after the track's category.
  const solo = (t: MusicTrack): Playlist => ({
    id: `track:${t.id}`,
    slug: `track-${t.slug}`,
    title: t.title,
    description: null,
    category: t.category,
    state: "focus",
    featured: false,
    tracks: [t],
  });

  return (
    <div className="flex flex-col gap-10">
      <ChipGroup
        type="single"
        aria-label="Show music for"
        value={filter}
        onValueChange={setFilter}
        options={FILTERS}
      />

      <section aria-labelledby="playlists-heading" className="flex flex-col gap-4">
        <h2 id="playlists-heading" className="type-h2">
          Playlists
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {shownPlaylists.map((p) => (
            <li key={p.id} className="flex flex-col gap-3 rounded-lg p-4 glass md:p-5">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    PLAYLIST_ART[p.state as MoodState] ?? "bg-gradient-orb",
                    "size-16 shrink-0 rounded-sm",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="type-body-sm text-ink-muted">
                    {categoryLabel(p.category)} · {STATE_LABELS[p.state as MoodState] ?? p.state}
                  </p>
                  <h3 className="truncate font-display text-[22px] leading-7">{p.title}</h3>
                  <p className="type-body-sm text-ink-muted">
                    {p.tracks.length} tracks · {playlistMinutes(p)} min
                  </p>
                </div>
                <PlayButton
                  playing={isCurrent(p) && player.isPlaying}
                  label={p.title}
                  onClick={() => press(p, isCurrent(p) ? player.index : 0)}
                />
              </div>
              {p.description ? <p className="text-ink-muted">{p.description}</p> : null}
              <ol className="flex flex-col" aria-label={`${p.title} tracks`}>
                {p.tracks.map((t, i) => {
                  const now = isCurrent(p, i);
                  return (
                    <li key={t.id} className="flex items-center gap-3 border-t border-line py-1.5">
                      <PlayButton
                        small
                        playing={now && player.isPlaying}
                        label={t.title}
                        onClick={() => press(p, i)}
                      />
                      <span className={cn("min-w-0 flex-1 truncate", now && "font-semibold text-blue-soft")}>
                        {t.title}
                      </span>
                      <span className="type-body-sm text-ink-muted tabular-nums">
                        {formatDuration(t.duration_seconds)}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="tracks-heading" className="flex flex-col gap-4">
        <h2 id="tracks-heading" className="type-h2">
          All tracks
        </h2>
        <ul className="flex flex-col rounded-lg px-4 glass">
          {shownTracks.map((t) => {
            const now = player.track?.id === t.id;
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-line py-2 last:border-0">
                <PlayButton
                  small
                  playing={now && player.isPlaying}
                  label={t.title}
                  onClick={() => (now ? player.toggle() : player.playPlaylist(solo(t)))}
                />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate", now && "font-semibold text-blue-soft")}>
                    {t.title}
                  </span>
                  <span className="block type-body-sm text-ink-muted">
                    {categoryLabel(t.category)}
                    {t.style ? ` · ${STYLE_LABELS[t.style] ?? t.style}` : ""}
                  </span>
                </span>
                <span className="type-body-sm text-ink-muted tabular-nums">
                  {formatDuration(t.duration_seconds)}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="type-body-sm text-ink-muted">
          Demo music, made for testing. Licensed tracks replace it before launch.
        </p>
      </section>
    </div>
  );
}
