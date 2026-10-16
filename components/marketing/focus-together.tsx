import { CalendarClock, Flag, Lock, MicOff, Music2, VideoOff } from "lucide-react";
import { ProgressRing } from "@/components/brand/progress-ring";
import { GlassCard } from "@/components/ui/glass-card";
import { Section } from "./section";

const POINTS = [
  { icon: CalendarClock, text: "Rooms run at set times, like a morning session or an hourly sprint." },
  { icon: VideoOff, text: "Cameras and mics are optional and off by default. You choose." },
  { icon: Music2, text: "Everyone hears the same music in sync and shares the same blocks." },
  { icon: Flag, text: "Adults only (18+), with report and block always one tap away." },
];

const PEOPLE = [
  { initials: "You", note: "Mic off", tone: "[background:var(--gradient-primary)]" },
  { initials: "TM", note: "Camera off", tone: "bg-gradient-orb" },
  { initials: "JK", note: "Camera off", tone: "bg-blue-soft text-surface" },
  { initials: "SA", note: "Camera off", tone: "bg-state-clear" },
  { initials: "LR", note: "Camera off", tone: "[background:var(--gradient-primary)]" },
];

export function FocusTogether() {
  return (
    <Section
      id="focus-together"
      eyebrow="Focus together"
      title={
        <>
          Company, <em>not</em> noise
        </>
      }
      intro="Sometimes it's easier to start when other people are starting too. Focus rooms give you quiet company on a schedule."
      className="relative"
    >
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <ul className="flex flex-col gap-4">
          {POINTS.map((p) => {
            const Icon = p.icon;
            return (
              <li key={p.text} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-pill border border-line bg-surface-glass">
                  <Icon className="size-5 stroke-[1.5]" aria-hidden="true" />
                </span>
                <p className="pt-2.5">{p.text}</p>
              </li>
            );
          })}
        </ul>

        <div
          role="img"
          aria-label="Preview of a focus room: a shared timer, the track everyone hears, and participants with cameras off."
          className="flex flex-col gap-3"
        >
          <div aria-hidden="true" className="flex flex-col gap-3">
            <p className="flex items-center gap-2 type-body-sm text-ink-muted">
              <span className="size-2 rounded-pill bg-orange" /> Example room · Deep work sprint
            </p>
            <GlassCard className="flex items-center gap-5">
              <ProgressRing value={0.3} size={72} strokeWidth={6} />
              <div>
                <p className="text-[36px] leading-10 font-extralight tabular-nums">41:08</p>
                <p className="type-body-sm text-ink-muted">Shared block · break at 10:50</p>
              </div>
            </GlassCard>
            <span className="inline-flex w-fit items-center gap-2 rounded-pill border border-violet/40 bg-violet/15 px-4 py-2 type-body-sm">
              <Music2 className="size-4 stroke-[1.5]" /> Everyone hears: Lagos Glass
            </span>
            <div className="grid grid-cols-3 gap-3">
              {PEOPLE.map((p) => (
                <GlassCard
                  key={p.initials}
                  padding="sm"
                  className="flex flex-col items-center gap-2 rounded-md"
                >
                  <span
                    className={`${p.tone} flex size-11 items-center justify-center rounded-pill type-body-sm text-on-brand`}
                  >
                    {p.initials}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] whitespace-nowrap text-ink-muted">
                    {p.note === "Mic off" ? <MicOff className="size-3" /> : <VideoOff className="size-3" />}
                    {p.note}
                  </span>
                </GlassCard>
              ))}
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-line p-4 text-center">
                <span className="type-h2">+7</span>
                <span className="text-xs text-ink-muted">working</span>
              </div>
            </div>
            <GlassCard padding="sm" className="rounded-md">
              <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                <Lock className="size-3" /> Your task · only you see this
              </p>
              <p className="mt-1 type-h3">Draft the summary and findings</p>
            </GlassCard>
          </div>
        </div>
      </div>
    </Section>
  );
}
