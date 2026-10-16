import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type ProgressRingProps = {
  /** Progress from 0 to 1. */
  value: number;
  /** Diameter in px. */
  size?: number;
  strokeWidth?: number;
  /** Accessible label, e.g. "Focus block progress". Omit to hide the ring from assistive tech. */
  label?: string;
  /** Human-readable value, e.g. "18 of 25 minutes". */
  valueText?: string;
  children?: ReactNode;
  className?: string;
};

/** Violet -> orange gradient stroke with rounded caps on a rgba(255,255,255,0.10) track. */
export function ProgressRing({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  valueText,
  children,
  className,
}: ProgressRingProps) {
  const gradientId = useId();
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);
  const a11y = label
    ? {
        role: "progressbar" as const,
        "aria-label": label,
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        "aria-valuenow": Math.round(clamped * 100),
        "aria-valuetext": valueText,
      }
    : { "aria-hidden": true as const };

  return (
    <div
      data-slot="progress-ring"
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      {...a11y}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-ring-from)" />
            <stop offset="100%" stopColor="var(--gradient-ring-to)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-track)"
          strokeWidth={strokeWidth}
        />
        {clamped > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
        ) : null}
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
    </div>
  );
}
