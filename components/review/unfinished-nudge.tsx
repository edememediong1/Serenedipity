import { LunaBadge } from "@/components/luna/luna-badge";
import { GlassCard } from "@/components/ui/glass-card";
import { loadUnfinished } from "@/lib/review/data";
import { ResolveButtons } from "./resolve-buttons";

/** Luna asks about tasks left unticked on earlier days. Renders nothing when there are none. */
export async function UnfinishedNudge() {
  const tasks = await loadUnfinished(3);
  if (!tasks.length) return null;
  return (
    <GlassCard className="flex flex-col gap-4 p-5 md:p-6" role="region" aria-labelledby="nudge-heading">
      <LunaBadge />
      <h2 id="nudge-heading" className="font-display text-[26px] leading-8">
        Were you able to finish {tasks.length === 1 ? "this" : "these"}?
      </h2>
      <ul className="flex flex-col gap-3">
        {tasks.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 rounded-md border border-line bg-surface-glass p-4">
            <p className="type-h3">{t.title}</p>
            <ResolveButtons taskId={t.id} title={t.title} />
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
