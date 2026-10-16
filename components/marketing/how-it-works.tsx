import { ListChecks, Mic, Music2 } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Section } from "./section";

const STEPS = [
  {
    icon: Mic,
    title: "Check in",
    body: "Say or type how you feel and what's due. Thirty seconds is plenty.",
  },
  {
    icon: ListChecks,
    title: "Get a plan",
    body: "Your focus guide breaks the work into small pieces and fits them before your deadline.",
  },
  {
    icon: Music2,
    title: "Focus with music",
    body: "Start the first block with music matched to the task, and a gentle timer to keep pace.",
  },
];

export function HowItWorks() {
  return (
    <Section
      id="how-it-works"
      eyebrow="How it works"
      title={
        <>
          From foggy to <em>moving</em>
        </>
      }
      intro="Feeling first, then a plan, then focus. Three steps, a couple of minutes."
    >
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <li key={step.title}>
              <GlassCard className="flex h-full flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-pill border border-line bg-surface-glass">
                    <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
                  </span>
                  <span
                    className="font-display text-[40px] leading-none text-ink-muted tabular-nums"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                </div>
                <h3 className="type-h2">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="text-ink-muted">{step.body}</p>
              </GlassCard>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
