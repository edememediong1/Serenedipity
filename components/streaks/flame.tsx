import { useId } from "react";
import { cn } from "@/lib/utils";

/** The streak flame: orange-to-violet gradient, flickering gently unless motion is reduced. Decorative. */
export function Flame({
  size = 48,
  lit = true,
  className,
}: {
  size?: number;
  lit?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn(lit && "flame-flicker", className)}
    >
      <defs>
        <linearGradient id={`${id}-outer`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lit ? "#7c4dff" : "#4b4f72"} />
          <stop offset="0.55" stopColor={lit ? "#ff6f61" : "#5b5f82"} />
          <stop offset="1" stopColor={lit ? "#ffb15c" : "#6b6f92"} />
        </linearGradient>
        <linearGradient id={`${id}-inner`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={lit ? "#ff8a4c" : "#6b6f92"} />
          <stop offset="1" stopColor={lit ? "#ffe2a8" : "#8a8eb0"} />
        </linearGradient>
      </defs>
      <path
        d="M24 3c2 7 9 11.5 11.5 18.5C38.5 30 34 43 24 43S9.5 31.5 12.5 23c1.2 3.6 3.6 5.6 5.5 6C16.5 19.5 21.5 10 24 3Z"
        fill={`url(#${id}-outer)`}
      />
      <path
        d="M24 21c1.3 4 5.5 6.6 6.2 10.6.9 5.2-2.3 9.4-6.2 9.4s-7-3.6-6.2-8.2c.5 1.6 1.6 2.6 2.7 2.8C19.7 30 22.3 25 24 21Z"
        fill={`url(#${id}-inner)`}
      />
    </svg>
  );
}
