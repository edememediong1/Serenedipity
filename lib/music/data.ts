import "server-only";
import { getSessionProfile } from "@/lib/auth/session";
import type { MusicTrack, Playlist } from "./types";

const TRACK_COLUMNS = "id, slug, title, category, style, file_url, duration_seconds";

/** Published playlists with their tracks in order (RLS: signed-in users read published rows). */
export async function listPlaylists(): Promise<Playlist[]> {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase
    .from("playlists")
    .select(
      `id, slug, title, description, category, state, featured, position, playlist_tracks(position, track:tracks(${TRACK_COLUMNS}))`,
    )
    .order("position");
  return (data ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    category: p.category,
    state: p.state,
    featured: p.featured,
    tracks: [...(p.playlist_tracks ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((pt) => (Array.isArray(pt.track) ? pt.track[0] : pt.track))
      .filter((t): t is MusicTrack => !!t),
  }));
}

export async function listAllTracks(): Promise<MusicTrack[]> {
  const { supabase } = await getSessionProfile();
  const { data } = await supabase.from("tracks").select(TRACK_COLUMNS).order("title");
  return data ?? [];
}
