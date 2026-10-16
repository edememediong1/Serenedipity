import { describe, expect, it } from "vitest";
import { canMove, isSolved, move, shuffle, SOLVED } from "@/lib/games/tiles";
import { scoreGuess, WORDS, wordFor } from "@/lib/games/words";

describe("zen tiles", () => {
  it("moves only tiles next to the space", () => {
    expect(canMove(SOLVED, 7)).toBe(true);
    expect(canMove(SOLVED, 0)).toBe(false);
    expect(move(SOLVED, 0)).toBe(SOLVED);
    expect(move(SOLVED, 7)).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  });
  it("shuffles into a solvable, unsolved board", () => {
    let seed = 1;
    const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const board = shuffle(rand);
    expect(isSolved(board)).toBe(false);
    expect([...board].sort()).toEqual([...SOLVED].sort());
  });
});

describe("word of the day", () => {
  it("has five-letter words and is stable per day", () => {
    for (const w of WORDS) expect(w.word).toMatch(/^[A-Z]{5}$/);
    expect(wordFor(new Date(2026, 9, 16))).toEqual(wordFor(new Date(2026, 9, 16, 23, 59)));
  });
  it("scores repeated letters fairly", () => {
    expect(scoreGuess("LLAMA", "LILAC")).toEqual(["right", "present", "present", "absent", "absent"]);
    expect(scoreGuess("BLOOM", "BLOOM").every((s) => s === "right")).toBe(true);
  });
});
