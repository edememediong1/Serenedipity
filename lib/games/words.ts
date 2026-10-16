/** Calm five-letter words for Word of the day. One per day, the same for everyone on that date. */
export const WORDS: { word: string; meaning: string }[] = [
  { word: "BLOOM", meaning: "To open up and flourish, like a flower in spring." },
  { word: "DRIFT", meaning: "To move slowly, carried along by air or water." },
  { word: "OCEAN", meaning: "A vast body of salt water; also, a great expanse of anything." },
  { word: "QUIET", meaning: "Making little or no noise; calm and still." },
  { word: "AMBER", meaning: "A warm golden-orange colour, like fossilised tree resin." },
  { word: "CEDAR", meaning: "A tall evergreen tree with fragrant wood." },
  { word: "LUNAR", meaning: "Of or relating to the moon." },
  { word: "STILL", meaning: "Not moving; deep and quiet." },
  { word: "SHORE", meaning: "The land along the edge of the sea or a lake." },
  { word: "MAPLE", meaning: "A tree known for its broad leaves and sweet sap." },
  { word: "CLOUD", meaning: "A soft mass of water droplets floating in the sky." },
  { word: "FROST", meaning: "A thin layer of ice crystals that forms on cold nights." },
  { word: "GROVE", meaning: "A small group of trees." },
  { word: "HAVEN", meaning: "A safe, peaceful place." },
  { word: "PEACE", meaning: "Freedom from disturbance; calm." },
  { word: "RIVER", meaning: "A natural stream of water flowing toward the sea." },
  { word: "STONE", meaning: "A small piece of rock, smoothed by time." },
  { word: "LIGHT", meaning: "What lets us see; also, not heavy." },
  { word: "DREAM", meaning: "Images and stories the mind makes during sleep." },
  { word: "EMBER", meaning: "A small glowing piece of wood in a dying fire." },
  { word: "GLADE", meaning: "An open space in a forest." },
  { word: "IVORY", meaning: "A soft creamy white." },
  { word: "LILAC", meaning: "A shrub with fragrant purple flowers; a pale violet." },
  { word: "MISTY", meaning: "Full of fine, soft mist." },
  { word: "OASIS", meaning: "A green spot in a desert; a pleasant refuge." },
  { word: "PETAL", meaning: "One of the coloured leaves of a flower." },
  { word: "BIRCH", meaning: "A slender tree with pale, papery bark." },
  { word: "CORAL", meaning: "A living reef builder of warm seas; a soft pinkish orange." },
];

/** Days since 2026-01-01 in the viewer's local calendar. */
export function dayIndex(date: Date) {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((local - Date.UTC(2026, 0, 1)) / 86_400_000);
}

export function wordFor(date: Date) {
  const n = WORDS.length;
  return WORDS[((dayIndex(date) % n) + n) % n];
}

export type LetterState = "right" | "present" | "absent";

/** Standard scoring that handles repeated letters. */
export function scoreGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(guess.length).fill("absent");
  const left: Record<string, number> = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) result[i] = "right";
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "right") continue;
    if (left[guess[i]]) {
      result[i] = "present";
      left[guess[i]]--;
    }
  }
  return result;
}
