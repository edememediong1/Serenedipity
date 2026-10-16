import { cn } from "@/lib/utils";

export type Bar = {
  label: string;
  value: number;
  /** Tooltip / table text, e.g. "42 min". */ display?: string;
};

type BarChartProps = {
  data: Bar[];
  /** Describes the chart for assistive tech and titles the table view. */
  title: string;
  /** Fixed top of the scale (e.g. 100 for percentages); otherwise a clean max above the data. */
  max?: number;
  height?: number;
  className?: string;
  /** Short labels under bars; long ones are shortened by the caller. */
  formatTick?: (v: number) => string;
};

function niceMax(v: number) {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

/**
 * Single-series column chart (dataviz spec: <=24px columns, 4px rounded data end, square baseline,
 * hairline grid, text in ink tokens, hover/focus tooltip per bar, and a table view for screen readers).
 */
export function BarChart({
  data,
  title,
  max,
  height = 160,
  className,
  formatTick = (v) => String(v),
}: BarChartProps) {
  const top = max ?? niceMax(Math.max(...data.map((d) => d.value), 0));
  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <div className="flex gap-2">
        <div
          className="flex flex-col justify-between py-0 text-right text-[11px] text-ink-muted tabular-nums"
          style={{ height }}
          aria-hidden="true"
        >
          <span>{formatTick(top)}</span>
          <span>{formatTick(top / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative flex-1" style={{ height }}>
          {/* Hairline gridlines */}
          {[0, 0.5, 1].map((f) => (
            <div
              key={f}
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-line"
              style={{ top: `${f * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end justify-around gap-[2px]" aria-hidden="true">
            {data.map((d, i) => {
              const h = top === 0 ? 0 : Math.max(d.value > 0 ? 3 : 0, (d.value / top) * height);
              return (
                <div
                  key={`${d.label}-${i}`}
                  className="group relative flex h-full flex-1 items-end justify-center"
                >
                  <div
                    className="w-full max-w-6 rounded-t-[4px] bg-violet transition-opacity duration-300 group-hover:opacity-80"
                    style={{ height: h }}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-sm border border-line bg-surface-deep px-2 py-1 text-xs whitespace-nowrap text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    {d.label}: {d.display ?? d.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pl-8" aria-hidden="true">
        <div className="flex flex-1 justify-around gap-[2px]">
          {data.map((d, i) => (
            <span
              key={`${d.label}-l-${i}`}
              className="flex-1 overflow-visible text-center text-[11px] whitespace-nowrap text-ink-muted"
            >
              {d.label}
            </span>
          ))}
        </div>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {data.map((d, i) => (
            <tr key={`${d.label}-t-${i}`}>
              <th scope="row">{d.label}</th>
              <td>{d.display ?? d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
