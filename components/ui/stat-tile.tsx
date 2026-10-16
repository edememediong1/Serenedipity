import type { ReactNode } from "react";
import { GlassCard } from "./glass-card";

/** A single headline number (dataviz: when the job is one number, show the number, not a chart). */
export function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <GlassCard padding="sm" className="flex flex-col gap-1 rounded-md md:p-5">
      <p className="type-body-sm text-ink-muted">{label}</p>
      <p className="text-[32px] leading-10 font-light tabular-nums">{value}</p>
      {hint ? <p className="type-body-sm text-ink-muted">{hint}</p> : null}
    </GlassCard>
  );
}
