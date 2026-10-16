"use client";

import { Pause, Play } from "lucide-react";
import { formatMinutes, STATE_LABELS } from "@/lib/seed/mixes";
import { cn } from "@/lib/utils";
import { usePlayer } from "./player-context";

/**
 * Persistent mini player slot. UI only, driven by mock state.
 * TODO(player): swap usePlayer() for the real engine; keep this component's props-free API.
 */
export function MiniPlayer({ className }: { className?: string }) {
  const { track, isPlaying, binaural, toggle } = usePlayer();
  return (
    <section
      aria-label="Now playing"
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line bg-surface-deep/90 p-2.5 pr-3 shadow-[0_10px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        className,
      )}
    >
      <span aria-hidden="true" className="size-11 shrink-0 rounded-sm [background:var(--gradient-primary)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate type-h3">{track.title}</p>
        <p className="truncate type-body-sm text-ink-muted">
          {STATE_LABELS[track.state]} · {binaural ? "binaural on" : formatMinutes(track.lengthMinutes)}
        </p>
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
        aria-pressed={isPlaying}
        className="flex size-12 shrink-0 items-center justify-center rounded-pill text-on-brand shadow-[0_6px_20px_rgba(124,77,255,0.4)] focus-ring [background:var(--gradient-primary)]"
      >
        {isPlaying ? (
          <Pause className="size-5 fill-current stroke-[1.5]" aria-hidden="true" />
        ) : (
          <Play className="size-5 translate-x-px fill-current stroke-[1.5]" aria-hidden="true" />
        )}
      </button>
    </section>
  );
}
