"use client";

import { useEffect, useState } from "react";
import { Cloud, Feather, Leaf, Moon, Star, Sun, Waves, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FACES: { name: string; icon: LucideIcon }[] = [
  { name: "Moon", icon: Moon },
  { name: "Star", icon: Star },
  { name: "Leaf", icon: Leaf },
  { name: "Cloud", icon: Cloud },
  { name: "Wave", icon: Waves },
  { name: "Sun", icon: Sun },
  { name: "Feather", icon: Feather },
];

function deal(pairs: number) {
  const cards = FACES.slice(0, pairs).flatMap((f, i) => [i, i]);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Turn over two cards at a time and find the pairs. No clock, no score: just a gentle focus reset. */
export function MemoryMatch({ pairs = 6 }: { pairs?: number }) {
  const [cards, setCards] = useState<number[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState("");

  // Deal after mount so the server and client render the same (face-down) grid.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- random deal must not run during SSR
  useEffect(() => setCards(deal(pairs)), [pairs]);

  // Turn a mismatched pair back over after a moment.
  useEffect(() => {
    if (open.length !== 2) return;
    const id = window.setTimeout(() => setOpen([]), 900);
    return () => window.clearTimeout(id);
  }, [open]);

  const done = cards.length > 0 && matched.size === pairs;

  function flip(i: number) {
    if (open.length === 2 || open.includes(i) || matched.has(cards[i])) return;
    if (open.length === 1 && cards[open[0]] === cards[i]) {
      setMatched((m) => new Set([...m, cards[i]]));
      setOpen([]);
      setStatus(`Matched the ${FACES[cards[i]].name.toLowerCase()} pair.`);
      return;
    }
    if (open.length === 1) setStatus("Not a pair. They'll turn back over.");
    setOpen((o) => [...o, i]);
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <ul className="grid w-full max-w-sm grid-cols-4 gap-2.5 sm:gap-3" aria-label="Cards">
        {(cards.length ? cards : Array.from({ length: pairs * 2 }, () => -1)).map((face, i) => {
          const shown = face >= 0 && (open.includes(i) || matched.has(face));
          const Icon = face >= 0 ? FACES[face].icon : null;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => flip(i)}
                disabled={face < 0 || matched.has(face)}
                aria-label={
                  shown && face >= 0 ? `Card ${i + 1}: ${FACES[face].name}` : `Card ${i + 1}, face down`
                }
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-md border border-line focus-ring transition-[background-color,transform] duration-300 motion-reduce:transition-none",
                  shown ? "bg-white/10" : "bg-surface-deep/70 hover:bg-white/[0.06]",
                  face >= 0 && matched.has(face) && "opacity-60",
                )}
              >
                {shown && Icon ? (
                  <Icon className="size-7 stroke-[1.5] text-blue-soft" aria-hidden="true" />
                ) : (
                  <span className="size-2 rounded-pill bg-white/20" aria-hidden="true" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="min-h-6 type-body-sm text-ink-muted" role="status">
        {done ? "All pairs found. Nice and slow." : status}
      </p>
      {done ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setMatched(new Set());
            setOpen([]);
            setStatus("");
            setCards(deal(pairs));
          }}
        >
          Deal again
        </Button>
      ) : null}
    </div>
  );
}
