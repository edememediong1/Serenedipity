/** Local seed data for "Picked for you". No audio yet. TODO(player): replace with tracks/playlists from Supabase. */
export type Mix = {
  id: string;
  title: string;
  category: "Deep Focus" | "Calm Mind" | "Clear the Fog" | "Creative Flow" | "Wind Down";
  state: "focus" | "calm" | "clear";
  lengthMinutes: number;
};

export const MIXES: readonly Mix[] = [
  {
    id: "rainy-bookstore-jazz",
    title: "Rainy Bookstore Jazz",
    category: "Calm Mind",
    state: "calm",
    lengthMinutes: 60,
  },
  { id: "second-cup", title: "Second Cup", category: "Deep Focus", state: "focus", lengthMinutes: 45 },
  {
    id: "reading-room-rain",
    title: "Rain on the Reading Room Window",
    category: "Deep Focus",
    state: "focus",
    lengthMinutes: 90,
  },
  { id: "lagos-glass", title: "Lagos Glass", category: "Creative Flow", state: "clear", lengthMinutes: 50 },
  {
    id: "morning-pages",
    title: "Morning Pages Piano",
    category: "Clear the Fog",
    state: "clear",
    lengthMinutes: 30,
  },
  { id: "slow-tide", title: "Slow Tide", category: "Wind Down", state: "calm", lengthMinutes: 60 },
];

export function formatMinutes(minutes: number) {
  return `${minutes} min`;
}

export const STATE_LABELS: Record<Mix["state"], string> = { focus: "Focus", calm: "Calm", clear: "Clear" };
