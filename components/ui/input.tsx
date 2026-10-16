import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClassName = cn(
  "block min-h-12 w-full rounded-sm border border-line bg-surface-deep px-4 text-[15px] leading-[22px] text-ink",
  "transition-colors duration-300 ease-out placeholder:text-ink-muted/70",
  "focus-ring hover:border-white/20 focus-visible:border-blue-soft",
  "disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-critical",
);

type InputProps = ComponentProps<"input"> & {
  /** Visible label. Pass `hideLabel` to keep it for screen readers only. */
  label: ReactNode;
  hideLabel?: boolean;
  description?: ReactNode;
  error?: string;
  containerClassName?: string;
};

/** Labelled text input with optional description and error message wired to aria attributes. */
export function Input({
  label,
  hideLabel,
  description,
  error,
  id,
  className,
  containerClassName,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description && !error ? `${inputId}-description` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-2", containerClassName)}>
      <label htmlFor={inputId} className={cn("type-body-sm text-ink", hideLabel && "sr-only")}>
        {label}
      </label>
      <input
        id={inputId}
        data-slot="input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(inputClassName, className)}
        {...props}
      />
      {description && !error ? (
        <p id={descriptionId} className="type-body-sm text-ink-muted">
          {description}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="type-body-sm text-critical">
          {error}
        </p>
      ) : null}
    </div>
  );
}
