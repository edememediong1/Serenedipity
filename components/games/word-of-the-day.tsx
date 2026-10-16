"use client";

import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { scoreGuess, wordFor, type LetterState } from "@/lib/games/words";
import { cn } from "@/lib/utils";

const ROWS = 6;
const KEYS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const COLORS: Record<LetterState, string> = {
  right: "bg-[#3d57e0] text-white border-transparent",
  present: "bg-[#b8541c] text-white border-transparent",
  absent: "bg-white/[0.06] text-ink-muted border-transparent",
};
const SAID: Record<LetterState, string> = {
  right: "in the right place",
  present: "in the word",
  absent: "not in the word",
};

/** One calm word a day. Six tries, any five letters count; the meaning is shown at the end either way. */
export function WordOfTheDay() {
  const [answer, setAnswer] = useState<{ word: string; meaning: string } | null>(null);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [announce, setAnnounce] = useState("");

  // The word depends on the viewer's local date, so pick it after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- local date is only known on the client
  useEffect(() => setAnswer(wordFor(new Date())), []);

  const won = !!answer && guesses.includes(answer.word);
  const over = won || guesses.length >= ROWS;

  function press(key: string) {
    if (!answer || over) return;
    if (key === "ENTER") {
      if (current.length !== 5) {
        setAnnounce("Five letters, please.");
        return;
      }
      const score = scoreGuess(current, answer.word);
      setGuesses((g) => [...g, current]);
      setAnnounce(
        current
          .split("")
          .map((l, i) => `${l} ${SAID[score[i]]}`)
          .join(", "),
      );
      setCurrent("");
    } else if (key === "BACK") setCurrent((c) => c.slice(0, -1));
    else if (/^[A-Z]$/.test(key) && current.length < 5) setCurrent((c) => c + key);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "Enter") press("ENTER");
      else if (e.key === "Backspace") press("BACK");
      else if (/^[a-z]$/i.test(e.key)) press(e.key.toUpperCase());
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const letterStates = new Map<string, LetterState>();
  if (answer)
    for (const g of guesses)
      scoreGuess(g, answer.word).forEach((s, i) => {
        const prev = letterStates.get(g[i]);
        if (prev === "right" || (prev === "present" && s === "absent")) return;
        letterStates.set(g[i], s);
      });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="grid gap-1.5" role="grid" aria-label="Guesses">
        {Array.from({ length: ROWS }, (_, r) => {
          const word = guesses[r] ?? (r === guesses.length ? current : "");
          const score = guesses[r] && answer ? scoreGuess(guesses[r], answer.word) : null;
          return (
            <div key={r} role="row" className="grid grid-cols-5 gap-1.5">
              {Array.from({ length: 5 }, (_, c) => (
                <span
                  key={c}
                  role="gridcell"
                  aria-label={word[c] ? `${word[c]}${score ? `, ${SAID[score[c]]}` : ""}` : "empty"}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-sm border border-line text-lg font-semibold sm:size-12",
                    score && COLORS[score[c]],
                  )}
                >
                  {word[c] ?? ""}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <p className="sr-only" role="status">
        {announce}
      </p>
      {over && answer ? (
        <div className="max-w-sm text-center" role="status">
          <p className="type-h3">{won ? "You found it." : `Today's word was ${answer.word}.`}</p>
          <p className="text-ink-muted">
            <span className="font-semibold text-ink">{answer.word.toLowerCase()}</span>: {answer.meaning}
          </p>
          <p className="mt-2 type-body-sm text-ink-muted">A new word arrives tomorrow.</p>
        </div>
      ) : (
        <div className="flex w-full max-w-md flex-col gap-1.5" aria-label="Keyboard">
          {KEYS.map((row, i) => (
            <div key={row} className="flex justify-center gap-1">
              {i === 2 ? (
                <button
                  type="button"
                  onClick={() => press("ENTER")}
                  className="h-12 rounded-sm bg-white/[0.08] px-2.5 text-xs font-semibold focus-ring hover:bg-white/[0.12]"
                >
                  Enter
                </button>
              ) : null}
              {row.split("").map((k) => {
                const s = letterStates.get(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => press(k)}
                    aria-label={s ? `${k}, ${SAID[s]}` : k}
                    className={cn(
                      "h-12 min-w-0 flex-1 rounded-sm border border-transparent bg-white/[0.08] text-sm font-semibold focus-ring hover:bg-white/[0.12] sm:max-w-10",
                      s && COLORS[s],
                    )}
                  >
                    {k}
                  </button>
                );
              })}
              {i === 2 ? (
                <button
                  type="button"
                  onClick={() => press("BACK")}
                  aria-label="Delete letter"
                  className="flex h-12 items-center rounded-sm bg-white/[0.08] px-2.5 focus-ring hover:bg-white/[0.12]"
                >
                  <Delete className="size-5 stroke-[1.5]" aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
