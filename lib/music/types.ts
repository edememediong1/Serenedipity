/** Music library types and labels, shared by server loaders and client components. */

export type Category = "deep-focus" | "calm-mind" | "clear-the-fog" | "creative-flow" | "wind-down";
export type MoodState = "focus" | "calm" | "clear";

export type MusicTrack = {
  id: string;
  slug: string;
  title: string;
  category: string;
  style: string | null;
  file_url: string;
  duration_seconds: number;
};

export type Playlist = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  state: string;
  featured: boolean;
  tracks: MusicTrack[];
};

export const CATEGORY_LABELS: Record<Category, string> = {
  "deep-focus": "Deep Focus",
  "calm-mind": "Calm Mind",
  "clear-the-fog": "Clear the Fog",
  "creative-flow": "Creative Flow",
  "wind-down": "Wind Down",
};

export const STYLE_LABELS: Record<string, string> = {
  piano: "Piano",
  jazz: "Jazz",
  lofi: "Lofi",
  "afro-lounge": "Afro lounge",
  ambient: "Ambient",
  binaural: "Binaural",
};

export const STATE_LABELS: Record<MoodState, string> = { focus: "Focus", calm: "Calm", clear: "Clear" };

export function categoryLabel(c: string) {
  return CATEGORY_LABELS[c as Category] ?? c;
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function playlistMinutes(p: Playlist) {
  return Math.max(1, Math.round(p.tracks.reduce((n, t) => n + t.duration_seconds, 0) / 60));
}
