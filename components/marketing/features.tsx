import { AudioWaveform, Library, Timer, Users } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Section } from "./section";

const FEATURES = [
  {
    icon: Library,
    title: "Focus music library",
    body: "Piano, jazz, lofi, Afro lounge and ambient mixes, sorted by mood and task. No ads.",
  },
  {
    icon: AudioWaveform,
    title: "Binaural focus layer",
    body: "A soft tone made in the app and mixed quietly under any track. Best with headphones.",
  },
  {
    icon: Timer,
    title: "Guided Pomodoro",
    body: "Work and break lengths that suit you, each block tied to a task, with music that shifts at breaks.",
  },
  {
    icon: Users,
    title: "Focus rooms",
    body: "Scheduled sessions where everyone hears the same music and works through shared blocks.",
  },
];

export function Features() {
  return (
    <Section
      id="features"
      eyebrow="Features"
      title={
        <>
          Everything you need to <em>settle in</em>
        </>
      }
      intro="One calm place for music, a plan and a timer, instead of four tabs."
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <li key={f.title}>
              <GlassCard className="flex h-full gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-pill text-on-brand bg-gradient-orb">
                  <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="type-h2">{f.title}</h3>
                  <p className="text-ink-muted">{f.body}</p>
                </div>
              </GlassCard>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
