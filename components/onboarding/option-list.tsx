"use client";

import { Check } from "lucide-react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Option<T extends string> = { value: T; label: ReactNode; hint?: ReactNode };

type OptionListProps<T extends string> = {
  options: readonly Option<T>[];
  value: T | null | undefined;
  onValueChange: (value: T) => void;
  "aria-labelledby"?: string;
  "aria-label"?: string;
  invalid?: boolean;
};

/** Full-width single-choice rows (a radiogroup with roving focus). Used for yes/no style questions. */
export function OptionList<T extends string>({
  options,
  value,
  onValueChange,
  invalid,
  ...aria
}: OptionListProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const delta =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (i + delta + options.length) % options.length;
    onValueChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-invalid={invalid || undefined} className="flex flex-col gap-3" {...aria}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={i === (current === -1 ? 0 : current) ? 0 : -1}
            onClick={() => onValueChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "flex min-h-16 items-center justify-between gap-4 rounded-md px-5 py-4 text-left focus-ring glass transition-colors duration-300",
              selected ? "border-violet bg-violet/15" : "hover:bg-white/10",
            )}
          >
            <span className="flex flex-col gap-0.5">
              <span className="type-h3">{o.label}</span>
              {o.hint ? <span className="type-body-sm text-ink-muted">{o.hint}</span> : null}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-pill border",
                selected
                  ? "border-transparent text-on-brand [background:var(--gradient-primary)]"
                  : "border-line",
              )}
            >
              {selected ? <Check className="size-4 stroke-[2]" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
