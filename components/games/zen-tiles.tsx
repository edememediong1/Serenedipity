"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { canMove, isSolved, move, shuffle, SOLVED } from "@/lib/games/tiles";
import { cn } from "@/lib/utils";

/** Slide the tiles back into order, 1 to 8. Each tile carries a step of the brand gradient. */
export function ZenTiles() {
  const [board, setBoard] = useState<number[]>(SOLVED);
  const [moves, setMoves] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random shuffle must not run during SSR
    setBoard(shuffle(Math.random));
    setReady(true);
  }, []);

  const solved = ready && isSolved(board);

  return (
    <div className="flex flex-col items-center gap-5">
      <ul className="grid w-full max-w-[18rem] grid-cols-3 gap-2" aria-label="Tiles">
        {board.map((tile, i) => (
          <li key={i} className="aspect-square">
            {tile === 0 ? (
              <span
                className="block size-full rounded-md border border-dashed border-line"
                aria-label="Empty space"
              />
            ) : (
              <button
                type="button"
                disabled={!ready || solved || !canMove(board, i)}
                onClick={() => {
                  setBoard((b) => move(b, i));
                  setMoves((m) => m + 1);
                }}
                aria-label={`Tile ${tile}${canMove(board, i) ? ", can move" : ""}`}
                className={cn(
                  "flex size-full items-center justify-center rounded-md text-2xl font-light text-on-brand tabular-nums focus-ring transition-[filter,opacity] duration-300 disabled:cursor-default",
                  canMove(board, i) && !solved ? "hover:brightness-110" : "opacity-90",
                )}
                style={{
                  background: `linear-gradient(135deg, hsl(${225 + tile * 9} 80% ${56 + tile}%), hsl(${255 + tile * 9} 75% 58%))`,
                }}
              >
                {tile}
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="min-h-6 type-body-sm text-ink-muted" role="status">
        {solved
          ? `In order again, in ${moves} moves. Take a breath.`
          : "Tap a tile next to the space to slide it."}
      </p>
      {solved ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setBoard(shuffle(Math.random));
            setMoves(0);
          }}
        >
          New puzzle
        </Button>
      ) : null}
    </div>
  );
}
