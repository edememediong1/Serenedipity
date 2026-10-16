"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
  IRemoteVideoTrack,
} from "agora-rtc-sdk-ng";

type TokenResponse = { appId: string; channel: string; uid: number; token: string };

async function fetchToken(roomId: string): Promise<TokenResponse | { error: string }> {
  try {
    const res = await fetch(`/api/rooms/${roomId}/rtc-token`, { method: "POST" });
    const body = await res.json();
    return res.ok ? body : { error: body.error ?? "Voice and video aren't available right now." };
  } catch {
    return { error: "Voice and video aren't available right now." };
  }
}

export type MediaStatus = "idle" | "connecting" | "ready" | "unavailable";

/**
 * Optional mic and camera for a room, over Agora. Joins the room's channel to hear and see others;
 * your own mic and camera stay off until you turn them on (PRD 4.5). Blocked people are never played.
 */
export function useRoomMedia({
  roomId,
  enabled,
  active,
  blockedUids,
}: {
  roomId: string;
  /** Agora is configured on the server. */
  enabled: boolean;
  /** You're inside the room. */
  active: boolean;
  blockedUids: Set<number>;
}) {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camRef = useRef<ICameraVideoTrack | null>(null);
  const audioRef = useRef(new Map<number, IRemoteAudioTrack>());
  const blockedRef = useRef(blockedUids);
  const [status, setStatus] = useState<MediaStatus>(enabled ? "idle" : "unavailable");
  const [message, setMessage] = useState<string | null>(
    enabled ? null : "Voice and video aren't set up yet.",
  );
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);
  const [localVideo, setLocalVideo] = useState<ICameraVideoTrack | null>(null);
  const [remoteVideo, setRemoteVideo] = useState<Map<number, IRemoteVideoTrack>>(new Map());
  const [speaking, setSpeaking] = useState<Set<number>>(new Set());

  // Keep blocked people silent as the list changes.
  useEffect(() => {
    blockedRef.current = blockedUids;
    for (const [uid, track] of audioRef.current) {
      if (blockedUids.has(uid)) track.stop();
      else if (!track.isPlaying) track.play();
    }
  }, [blockedUids]);

  useEffect(() => {
    if (!enabled || !active) return;
    let cancelled = false;

    (async () => {
      setStatus("connecting");
      const creds = await fetchToken(roomId);
      if (cancelled) return;
      if ("error" in creds) {
        setStatus("unavailable");
        setMessage(creds.error);
        return;
      }
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      AgoraRTC.setLogLevel(3);
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        const uid = Number(user.uid);
        if (mediaType === "audio" && user.audioTrack) {
          audioRef.current.set(uid, user.audioTrack);
          if (!blockedRef.current.has(uid)) user.audioTrack.play();
        }
        if (mediaType === "video" && user.videoTrack) {
          const track = user.videoTrack;
          setRemoteVideo((m) => new Map(m).set(uid, track));
        }
      });
      client.on("user-unpublished", (user, mediaType) => {
        const uid = Number(user.uid);
        if (mediaType === "audio") audioRef.current.delete(uid);
        if (mediaType === "video")
          setRemoteVideo((m) => {
            const next = new Map(m);
            next.delete(uid);
            return next;
          });
      });
      client.on("user-left", (user) => {
        const uid = Number(user.uid);
        audioRef.current.delete(uid);
        setRemoteVideo((m) => {
          const next = new Map(m);
          next.delete(uid);
          return next;
        });
      });
      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (levels) => {
        setSpeaking(new Set(levels.filter((l) => l.level > 5).map((l) => Number(l.uid))));
      });
      // Renewal is refused once someone has been removed, which drops them from the call.
      client.on("token-privilege-will-expire", async () => {
        const next = await fetchToken(roomId);
        if ("error" in next) await client.leave();
        else await client.renewToken(next.token);
      });

      try {
        await client.join(creds.appId, creds.channel, creds.token, creds.uid);
        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) {
          setStatus("unavailable");
          setMessage("Couldn't connect voice and video. The timer and music still work.");
        }
      }
    })();

    const audio = audioRef.current;
    return () => {
      cancelled = true;
      micRef.current?.close();
      camRef.current?.close();
      micRef.current = null;
      camRef.current = null;
      audio.clear();
      const client = clientRef.current;
      clientRef.current = null;
      void client?.leave();
      setMicOn(false);
      setCamOn(false);
      setLocalVideo(null);
      setRemoteVideo(new Map());
    };
  }, [enabled, active, roomId]);

  const toggleMic = useCallback(async () => {
    const client = clientRef.current;
    if (!client || status !== "ready") return;
    if (micRef.current) {
      await client.unpublish(micRef.current);
      micRef.current.close();
      micRef.current = null;
      setMicOn(false);
      return;
    }
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const track = await AgoraRTC.createMicrophoneAudioTrack();
      micRef.current = track;
      await client.publish(track);
      setMicOn(true);
      setMessage(null);
    } catch {
      setMessage("We couldn't use your microphone. Check your browser's permissions.");
    }
  }, [status]);

  const toggleCam = useCallback(async () => {
    const client = clientRef.current;
    if (!client || status !== "ready") return;
    if (camRef.current) {
      await client.unpublish(camRef.current);
      camRef.current.close();
      camRef.current = null;
      setCamOn(false);
      setLocalVideo(null);
      return;
    }
    try {
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      const track = await AgoraRTC.createCameraVideoTrack({ encoderConfig: "360p_1" });
      camRef.current = track;
      await client.publish(track);
      setCamOn(true);
      setLocalVideo(track);
      setMessage(null);
    } catch {
      setMessage("We couldn't use your camera. Check your browser's permissions.");
    }
  }, [status]);

  return { status, message, micOn, camOn, toggleMic, toggleCam, localVideo, remoteVideo, speaking };
}
