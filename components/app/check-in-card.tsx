import Link from "next/link";
import { Mic } from "lucide-react";
import { SignatureOrb } from "@/components/brand/signature-orb";
import { GlassCard } from "@/components/ui/glass-card";

const MOODS = [
  { value: "foggy", label: "Foggy" },
  { value: "stressed", label: "Stressed" },
  { value: "deadline", label: "Deadline today" },
  { value: "ready", label: "Ready" },
];

/**
 * The check-in entry point: the orb microphone, the question and mood chips.
 * TODO(check-in): open the voice check-in instead of the placeholder route.
 */
export function CheckInCard() {
  return (
    <GlassCard className="flex h-full flex-col justify-center gap-5 p-5 md:p-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/check-in"
          aria-label="Start a voice check-in"
          className="shrink-0 rounded-pill focus-ring transition-transform duration-300 hover:scale-[1.03] motion-reduce:hover:scale-100"
        >
          <SignatureOrb
            size={64}
            halo
            icon={<Mic className="size-6" aria-hidden="true" />}
            className="md:size-[72px]!"
          />
        </Link>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg leading-6 font-semibold md:type-h2">How are you feeling?</h2>
          <p className="text-ink-muted">Talk for 20 seconds. Get a plan for today.</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2" aria-label="Or pick a mood">
        {MOODS.map((m) => (
          <li key={m.value}>
            <Link
              href={`/app/check-in?mood=${m.value}`}
              className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface-glass px-4 text-sm leading-5 font-semibold text-ink focus-ring transition-colors duration-300 hover:bg-white/10"
            >
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
