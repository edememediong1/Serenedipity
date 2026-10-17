"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MusicTrack, Playlist } from "@/lib/music/types";

/**
 * The app-wide music player: one <audio> element that lives in the app shell, so music keeps
 * playing while you move between pages. Plays a playlist (queue) in order and loops at the end.
 */
type PlayerState = {
  playlist: Playlist | null;
  track: MusicTrack | null;
  index: number;
  isPlaying: boolean;
  /** Something went wrong loading audio (shown in the player). */
  error: string | null;
  playPlaylist: (playlist: Playlist, startIndex?: number) => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
};

type ProgressState = { position: number; duration: number; seek: (seconds: number) => void };

const PlayerContext = createContext<PlayerState | null>(null);
const ProgressContext = createContext<ProgressState | null>(null);
const STORAGE_KEY = "player-v1";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const track = playlist?.tracks[index] ?? null;
  const queueRef = useRef<{ playlist: Playlist | null; index: number }>({ playlist: null, index: 0 });
  useEffect(() => {
    queueRef.current = { playlist, index };
  }, [playlist, index]);

  // One audio element for the whole app.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    const onTime = () => setPosition(audio.currentTime);
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      setIsPlaying(false);
      setError("This track couldn't be played.");
    };
    const onEnded = () => {
      const { playlist: p, index: i } = queueRef.current;
      if (!p?.tracks.length) return;
      setIndex((i + 1) % p.tracks.length);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("error", onError);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeAttribute("src");
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, []);

  // Load the library once so the mini player has something ready (the last playlist, or the first one).
  const wantsPlay = useRef(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("playlists")
        .select(
          "id, slug, title, description, category, state, featured, position, playlist_tracks(position, track:tracks(id, slug, title, category, style, file_url, duration_seconds))",
        )
        .order("position");
      if (cancelled || !data?.length) return;
      let saved: { slug?: string; index?: number } = {};
      try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      } catch {
        // No saved state.
      }
      const lists: Playlist[] = data.map((p) => ({
        ...p,
        tracks: [...(p.playlist_tracks ?? [])]
          .sort((a, b) => a.position - b.position)
          .map((pt) => (Array.isArray(pt.track) ? pt.track[0] : pt.track))
          .filter((t): t is MusicTrack => !!t),
      }));
      const start = lists.find((p) => p.slug === saved.slug) ?? lists[0];
      // Don't replace something the person already started while this loaded.
      setPlaylist((current) => current ?? start);
      setIndex((current) =>
        queueRef.current.playlist ? current : Math.min(saved.index ?? 0, start.tracks.length - 1),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Point the audio element at the current track; play it if asked.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track) return;
    const src = new URL(track.file_url, window.location.origin).href;
    if (audio.src !== src) {
      audio.src = src;
      setPosition(0);
      setDuration(track.duration_seconds);
      setError(null);
    }
    if (wantsPlay.current) {
      audio.play().catch(() => setIsPlaying(false));
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ slug: playlist?.slug, index }));
    } catch {
      // Not remembered without storage.
    }
  }, [track, playlist?.slug, index]);

  const playPlaylist = useCallback((p: Playlist, startIndex = 0) => {
    if (!p.tracks.length) return;
    wantsPlay.current = true;
    const same = queueRef.current.playlist?.id === p.id && queueRef.current.index === startIndex;
    queueRef.current = { playlist: p, index: startIndex };
    setPlaylist(p);
    setIndex(startIndex);
    if (same) void audioRef.current?.play().catch(() => setIsPlaying(false));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !queueRef.current.playlist) return;
    if (audio.paused) {
      wantsPlay.current = true;
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      wantsPlay.current = false;
      audio.pause();
    }
  }, []);

  const pause = useCallback(() => {
    wantsPlay.current = false;
    audioRef.current?.pause();
  }, []);

  const step = useCallback((delta: number) => {
    const { playlist: p, index: i } = queueRef.current;
    if (!p?.tracks.length) return;
    const audio = audioRef.current;
    // "Previous" restarts the track if we're more than a few seconds in.
    if (delta < 0 && audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setIndex((i + delta + p.tracks.length) % p.tracks.length);
  }, []);
  const next = useCallback(() => step(1), [step]);
  const previous = useCallback(() => step(-1), [step]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (audio && Number.isFinite(seconds)) {
      audio.currentTime = seconds;
      setPosition(seconds);
    }
  }, []);

  // Lock-screen and headset controls.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !track) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: "Serenedipity",
      album: playlist?.title ?? "",
    });
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", pause);
    navigator.mediaSession.setActionHandler("nexttrack", next);
    navigator.mediaSession.setActionHandler("previoustrack", previous);
  }, [track, playlist?.title, toggle, pause, next, previous]);

  const value = useMemo<PlayerState>(
    () => ({ playlist, track, index, isPlaying, error, playPlaylist, toggle, pause, next, previous }),
    [playlist, track, index, isPlaying, error, playPlaylist, toggle, pause, next, previous],
  );
  const progress = useMemo<ProgressState>(() => ({ position, duration, seek }), [position, duration, seek]);

  return (
    <PlayerContext value={value}>
      <ProgressContext value={progress}>{children}</ProgressContext>
    </PlayerContext>
  );
}

export function usePlayer() {
  const ctx = use(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside PlayerProvider");
  return ctx;
}

export function usePlayerProgress() {
  const ctx = use(ProgressContext);
  if (!ctx) throw new Error("usePlayerProgress must be used inside PlayerProvider");
  return ctx;
}
