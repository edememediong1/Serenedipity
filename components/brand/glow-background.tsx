import { cn } from "@/lib/utils";

export type GlowMood = "default" | "focus" | "check-in" | "rooms" | "finish";

type GlowBackgroundProps = {
  /** Moves the orbs: focus = blue centre, check-in = violet top centre, rooms/finish = orange top-right. */
  mood?: GlowMood;
  /** Slow drift over ~30s. Always disabled under prefers-reduced-motion. */
  drift?: boolean;
  className?: string;
};

/**
 * The signature midnight-with-glow background. Renders a fixed layer behind the page,
 * so place it once per screen (layouts do this for you).
 */
export function GlowBackground({ mood = "default", drift = true, className }: GlowBackgroundProps) {
  return (
    <div aria-hidden="true" data-slot="glow-background" className={cn("glow-frame", className)}>
      <div className="glow-layer" data-mood={mood} data-drift={drift ? "true" : "false"} />
    </div>
  );
}
