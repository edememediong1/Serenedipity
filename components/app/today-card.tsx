import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProgressRing } from "@/components/brand/progress-ring";
import { GlassCard } from "@/components/ui/glass-card";

/**
 * Today's focus minutes and completed blocks.
 * Values come from focus_blocks (see lib/focus/stats.ts); zeros render as a friendly empty state.
 */
export function TodayCard({ minutes = 0, blocks = 0 }: { minutes?: number; blocks?: number }) {
  const empty = minutes === 0 && blocks === 0;
  return (
    <GlassCard className="flex h-full flex-col gap-5 p-5 md:p-6">
      <h2 className="type-h2">Today</h2>
      <div className="flex items-center gap-5">
        <ProgressRing
          value={0}
          size={88}
          strokeWidth={7}
          label="Focus blocks today"
          valueText={`${blocks} blocks done`}
        >
          <span className="text-2xl font-light tabular-nums">{blocks}</span>
        </ProgressRing>
        <dl className="grid flex-1 grid-cols-2 gap-4">
          <div>
            <dt className="type-body-sm text-ink-muted">Focus minutes</dt>
            <dd className="text-[32px] leading-10 font-extralight tabular-nums">{minutes}</dd>
          </div>
          <div>
            <dt className="type-body-sm text-ink-muted">Blocks done</dt>
            <dd className="text-[32px] leading-10 font-extralight tabular-nums">{blocks}</dd>
          </div>
        </dl>
      </div>
      {empty ? (
        <p className="text-ink-muted">Nothing yet today, and that&apos;s fine. One block is a good start.</p>
      ) : (
        <p className="text-ink-muted">
          {blocks} {blocks === 1 ? "block" : "blocks"} done. Nice work.
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-x-6">
        <Link
          href="/app/focus"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
        >
          Start a focus block <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
        </Link>
        <Link
          href="/app/review"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
        >
          How did yesterday go? <ArrowRight className="size-4 stroke-[1.5]" aria-hidden="true" />
        </Link>
      </div>
    </GlassCard>
  );
}
