import { Clock, Headphones, MessageCircle, Mic, Pause, Play, Users } from "lucide-react";
import { SignatureOrb } from "@/components/brand/signature-orb";
import { STATES } from "@/components/app/state-cards";
import { cn } from "@/lib/utils";

const MOODS = ["Foggy", "Stressed", "Deadline today", "Ready"];
const TABS = [
  { label: "Listen", icon: Headphones, active: true },
  { label: "Check in", icon: MessageCircle },
  { label: "Focus", icon: Clock },
  { label: "Rooms", icon: Users },
];

/**
 * The Home screen from the design system, built in code (not an image).
 * Purely illustrative: hidden from assistive tech, described by the wrapper's label.
 */
export function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="Preview of the app's Home screen: a check-in card, Focus, Calm and Clear states, and a mix picked for you."
      className={cn("relative mx-auto w-[300px] shrink-0 select-none", className)}
    >
      <div
        aria-hidden="true"
        className="relative overflow-hidden rounded-[44px] border border-line bg-surface p-[10px] shadow-[0_40px_120px_rgba(124,77,255,0.35)]"
      >
        <div className="relative h-[640px] overflow-hidden rounded-[36px] [background:var(--glow-default)]">
          {/* Status bar notch */}
          <div className="absolute top-2 left-1/2 h-6 w-24 -translate-x-1/2 rounded-pill bg-black/80" />
          <div className="flex h-full flex-col px-4 pt-12 pb-4">
            <p className="text-[10px] font-semibold tracking-[0.08em] text-ink-muted">Good morning</p>
            <p className="mt-1 font-display text-[34px] leading-[36px]">
              Find your <em>focus</em>
            </p>

            <div className="mt-4 rounded-[20px] p-3 glass">
              <div className="flex items-center gap-3">
                <SignatureOrb size={44} halo icon={<Mic className="size-4" />} />
                <div>
                  <p className="text-[13px] leading-4 font-semibold">How are you feeling?</p>
                  <p className="mt-0.5 text-[10px] leading-3 text-ink-muted">
                    Talk for 20 seconds. Get a plan for today.
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {MOODS.map((m) => (
                  <span
                    key={m}
                    className="rounded-pill border border-line px-2.5 py-1 text-[10px] font-semibold"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between">
              <p className="text-[14px] font-semibold">Choose a state</p>
              <p className="text-[10px] font-semibold text-blue-soft">All music</p>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {STATES.map((s) => {
                const Icon = s.icon;
                return (
                  <div
                    key={s.id}
                    className={cn(
                      s.className,
                      "flex h-[100px] flex-col rounded-[16px] p-2.5 text-on-brand ring-1 ring-white/10 ring-inset",
                    )}
                  >
                    <Icon className="size-3.5 stroke-[1.5]" />
                    <span className="mt-auto text-[12px] leading-4 font-semibold">{s.title}</span>
                    <span className="text-[9px] leading-3 opacity-90">{s.subtitle}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2.5 rounded-[18px] p-2.5 glass">
              <span className="size-10 shrink-0 rounded-[8px] bg-gradient-orb" />
              <div className="min-w-0 flex-1">
                <p className="text-[9px] text-ink-muted">Picked for you</p>
                <p className="truncate font-display text-[15px] leading-4">Rainy Bookstore Jazz</p>
                <p className="text-[9px] text-ink-muted">Calm · 60 min</p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-pill bg-ink text-surface">
                <Play className="size-3.5 fill-current" />
              </span>
            </div>

            <div className="mt-auto">
              <div className="flex items-center gap-2.5 rounded-[18px] border border-line bg-surface-deep/90 p-2">
                <span className="size-8 shrink-0 rounded-[8px] [background:var(--gradient-primary)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold">Second Cup</p>
                  <p className="text-[9px] text-ink-muted">Focus · binaural on</p>
                </div>
                <span className="flex size-8 items-center justify-center rounded-pill [background:var(--gradient-primary)]">
                  <Pause className="size-3.5 fill-current" />
                </span>
              </div>
              <div className="mt-2 grid grid-cols-4">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <span
                      key={t.label}
                      className={cn(
                        "flex flex-col items-center gap-0.5 py-1 text-[9px]",
                        t.active ? "text-ink" : "text-ink-muted",
                      )}
                    >
                      <Icon className="size-4 stroke-[1.5]" />
                      {t.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
