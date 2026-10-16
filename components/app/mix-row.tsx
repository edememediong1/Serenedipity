"use client";

import { Play } from "lucide-react";
import { formatMinutes, STATE_LABELS, type Mix } from "@/lib/seed/mixes";
import { cn } from "@/lib/utils";
import { usePlayer } from "./player-context";

const ART: Record<Mix["state"], string> = {
  focus: "bg-state-focus",
  calm: "bg-gradient-orb",
  clear: "bg-state-clear",
};

/** "Picked for you": horizontal scroll on mobile, grid from md. No audio yet; play updates the mock player. */
export function MixRow({ mixes }: { mixes: readonly Mix[] }) {
  const { play, track, isPlaying } = usePlayer();
  return (
    <ul className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 xl:grid-cols-3">
      {mixes.map((mix) => {
        const current = track.id === mix.id && isPlaying;
        return (
          <li key={mix.id} className="w-[85%] shrink-0 snap-start md:w-auto">
            <div className="flex items-center gap-3 rounded-lg p-3 pr-4 glass">
              <span aria-hidden="true" className={cn(ART[mix.state], "size-16 shrink-0 rounded-sm")} />
              <div className="min-w-0 flex-1">
                <p className="type-body-sm text-ink-muted">{mix.category}</p>
                <p className="truncate font-display text-[22px] leading-7">{mix.title}</p>
                <p className="type-body-sm text-ink-muted">
                  {STATE_LABELS[mix.state]} · {formatMinutes(mix.lengthMinutes)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => play(mix)}
                aria-label={current ? `${mix.title} is playing` : `Play ${mix.title}`}
                className="flex size-12 shrink-0 items-center justify-center rounded-pill bg-ink text-surface focus-ring transition-transform duration-300 hover:scale-105 motion-reduce:hover:scale-100"
              >
                <Play className="size-5 translate-x-px fill-current stroke-[1.5]" aria-hidden="true" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
