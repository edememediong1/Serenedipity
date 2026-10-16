import Link from "next/link";
import { CircleDot, Sun, Waves, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FocusState = "focus" | "calm" | "clear";

export const STATES: readonly {
  id: FocusState;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  className: string;
}[] = [
  { id: "focus", title: "Focus", subtitle: "Deep work", icon: CircleDot, className: "bg-state-focus" },
  { id: "calm", title: "Calm", subtitle: "Unwind", icon: Waves, className: "bg-state-calm" },
  { id: "clear", title: "Clear", subtitle: "Lift the fog", icon: Sun, className: "bg-state-clear" },
];

type StateCardProps = {
  state: (typeof STATES)[number];
  href?: string;
};

/** Focus / Calm / Clear gradient card with white text. Renders a link when href is set. */
export function StateCard({ state, href }: StateCardProps) {
  const Icon = state.icon;
  const inner = (
    <>
      <Icon className="size-6 stroke-[1.5]" aria-hidden="true" />
      <span className="mt-auto flex flex-col">
        <span className="text-xl leading-6 font-semibold">{state.title}</span>
        <span className="type-body-sm opacity-90">{state.subtitle}</span>
      </span>
    </>
  );
  const cls = cn(
    state.className,
    "flex flex-col text-on-brand ring-1 ring-white/10 ring-inset",
    "min-h-36 rounded-lg p-4 md:min-h-40 md:p-5",
  );

  if (!href) return <div className={cls}>{inner}</div>;
  return (
    <Link
      href={href}
      className={cn(
        cls,
        "focus-ring transition-transform duration-300 ease-out hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
      )}
    >
      {inner}
    </Link>
  );
}
