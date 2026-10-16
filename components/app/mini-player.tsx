"use client";

import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useId } from "react";
import { categoryLabel, formatDuration } from "@/lib/music/types";
import { cn } from "@/lib/utils";
import { usePlayer, usePlayerProgress } from "./player-context";

function Progress() {
  const { position, duration, seek } = usePlayerProgress();
  const { track } = usePlayer();
  // The player renders twice (desktop dock and mobile bar), so ids must be unique.
  const id = useId();
  const max = duration || track?.duration_seconds || 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-9 text-right text-[11px] text-ink-muted tabular-nums">
        {formatDuration(position)}
      </span>
      <label htmlFor={id} className="sr-only">
        Position in {track?.title ?? "track"}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={Math.max(1, Math.floor(max))}
        step={1}
        value={Math.floor(position)}
        onChange={(e) => seek(Number(e.target.value))}
        aria-valuetext={`${formatDuration(position)} of ${formatDuration(max)}`}
        className="h-1 min-w-0 flex-1 cursor-pointer accent-[#7c4dff]"
      />
      <span className="w-9 text-[11px] text-ink-muted tabular-nums">{formatDuration(max)}</span>
    </div>
  );
}

/** Persistent mini player: what's playing, play/pause, previous/next and a seek bar. */
export function MiniPlayer({ className }: { className?: string }) {
  const { track, playlist, isPlaying, toggle, next, previous, error } = usePlayer();
  const title = track?.title ?? "Loading music…";
  return (
    <section
      aria-label="Now playing"
      className={cn(
        "flex flex-col gap-1.5 rounded-lg border border-line bg-surface-deep/90 p-2.5 pr-3 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            "size-11 shrink-0 rounded-sm [background:var(--gradient-primary)]",
            isPlaying && "motion-safe:animate-pulse",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate type-h3">{title}</p>
          <p className="truncate type-body-sm text-ink-muted">
            {error ??
              (playlist ? `${playlist.title} · ${categoryLabel(track?.category ?? playlist.category)}` : " ")}
          </p>
        </div>
        <button
          type="button"
          onClick={previous}
          disabled={!track}
          aria-label="Previous track"
          className="hidden size-11 shrink-0 items-center justify-center rounded-pill text-ink-muted focus-ring hover:text-ink disabled:opacity-40 sm:flex"
        >
          <SkipBack className="size-5 stroke-[1.5]" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={toggle}
          disabled={!track}
          aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
          aria-pressed={isPlaying}
          className="flex size-12 shrink-0 items-center justify-center rounded-pill text-on-brand shadow-[0_6px_20px_rgba(124,77,255,0.4)] focus-ring [background:var(--gradient-primary)] disabled:opacity-60"
        >
          {isPlaying ? (
            <Pause className="size-5 fill-current stroke-[1.5]" aria-hidden="true" />
          ) : (
            <Play className="size-5 translate-x-px fill-current stroke-[1.5]" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!track}
          aria-label="Next track"
          className="flex size-11 shrink-0 items-center justify-center rounded-pill text-ink-muted focus-ring hover:text-ink disabled:opacity-40"
        >
          <SkipForward className="size-5 stroke-[1.5]" aria-hidden="true" />
        </button>
      </div>
      {track ? <Progress /> : null}
    </section>
  );
}
