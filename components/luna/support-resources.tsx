import { Phone } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { SUPPORT_RESOURCES } from "@/lib/luna/safety";

/** Crisis and support lines (PRD section 5). Shown whenever a check-in steps out of planning. */
export function SupportResources({ headingLevel = 2 }: { headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <GlassCard className="flex flex-col gap-4 p-5 md:p-6" role="region" aria-labelledby="support-heading">
      <Heading id="support-heading" className="type-h2">
        Talk to someone now
      </Heading>
      <ul className="flex flex-col gap-3">
        {SUPPORT_RESOURCES.map((r) => (
          <li
            key={r.name}
            className="flex flex-col gap-2 rounded-md border border-line bg-surface-glass p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="type-h3">{r.name}</p>
              <p className="type-body-sm text-ink-muted">{r.detail}</p>
            </div>
            <a
              href={r.href}
              {...(r.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-ink px-4 type-body-sm font-semibold text-surface focus-ring"
            >
              <Phone className="size-4 stroke-[1.5]" aria-hidden="true" />
              {r.action}
            </a>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
