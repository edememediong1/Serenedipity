"use client";

import { Check } from "lucide-react";
import { useRef, type ComponentProps, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const chipClassName = cn(
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-pill border px-4 font-sans text-sm leading-5 font-semibold",
  "focus-ring transition-[background-color,border-color,color,transform] duration-300 ease-out",
  "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:stroke-[1.5]",
);

const unselected = "border-line bg-surface-glass text-ink hover:bg-white/10";
const selectedCls = "border-transparent text-on-brand [background:var(--gradient-primary)]";

type ChipProps = ComponentProps<"button"> & {
  /** When set, renders as a toggle (aria-pressed). Leave undefined for a plain action chip. */
  selected?: boolean;
};

/** A pill-shaped chip. As a toggle it shows a check icon when selected, so colour is never the only signal. */
export function Chip({ selected, className, children, type, ...props }: ChipProps) {
  return (
    <button
      type={type ?? "button"}
      data-slot="chip"
      data-selected={selected ? "true" : undefined}
      aria-pressed={selected}
      className={cn(chipClassName, selected ? selectedCls : unselected, className)}
      {...props}
    >
      {selected ? <Check aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export type ChipOption<T extends string = string> = {
  value: T;
  label: ReactNode;
  description?: ReactNode;
};

type BaseGroupProps<T extends string> = {
  options: readonly ChipOption<T>[];
  /** Accessible name for the group (use with a visible heading via aria-labelledby when possible). */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  className?: string;
  disabled?: boolean;
};

type SingleProps<T extends string> = BaseGroupProps<T> & {
  type: "single";
  value: T | null | undefined;
  onValueChange: (value: T) => void;
};

type MultipleProps<T extends string> = BaseGroupProps<T> & {
  type: "multiple";
  value: readonly T[];
  onValueChange: (value: T[]) => void;
};

/**
 * Chip group.
 * - `single`: a radiogroup with roving focus (arrow keys move and select).
 * - `multiple`: a group of toggle buttons (aria-pressed).
 */
export function ChipGroup<T extends string>(props: SingleProps<T> | MultipleProps<T>) {
  const { options, className, disabled } = props;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  if (props.type === "multiple") {
    const selected = new Set(props.value);
    return (
      <div
        role="group"
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
        aria-describedby={props["aria-describedby"]}
        className={cn("flex flex-wrap gap-2", className)}
      >
        {options.map((option) => {
          const isOn = selected.has(option.value);
          return (
            <Chip
              key={option.value}
              selected={isOn}
              disabled={disabled}
              onClick={() => {
                const next = isOn
                  ? props.value.filter((v) => v !== option.value)
                  : [...props.value, option.value];
                props.onValueChange(next);
              }}
            >
              {option.label}
            </Chip>
          );
        })}
      </div>
    );
  }

  const currentIndex = options.findIndex((o) => o.value === props.value);
  const focusIndex = currentIndex === -1 ? 0 : currentIndex;

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % options.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      next = (index - 1 + options.length) % options.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = options.length - 1;
    props.onValueChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      aria-labelledby={props["aria-labelledby"]}
      aria-describedby={props["aria-describedby"]}
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((option, index) => {
        const isOn = option.value === props.value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isOn}
            tabIndex={index === focusIndex ? 0 : -1}
            disabled={disabled}
            data-slot="chip"
            data-selected={isOn ? "true" : undefined}
            onClick={() => props.onValueChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(chipClassName, isOn ? selectedCls : unselected)}
          >
            {isOn ? <Check aria-hidden="true" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
