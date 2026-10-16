"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_SECONDS = 60;

export type VoiceStatus = "idle" | "recording" | "transcribing";

function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/**
 * Records a short voice note in the browser and sends it to /api/luna/transcribe.
 * Audio stays in memory only and is discarded after transcription.
 */
export function useVoiceNote(onTranscript: (text: string, seconds: number) => void) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);

  const cleanupTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const start = useCallback(async () => {
    setError(null);
    const mimeType = pickMimeType();
    if (mimeType === null || !navigator.mediaDevices?.getUserMedia) {
      setError("Voice notes aren't supported in this browser. You can type instead.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("We couldn't use your microphone. Check the permission, or type instead.");
      return;
    }
    chunks.current = [];
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorder.current = rec;
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.current.push(e.data);
    rec.onstop = async () => {
      cleanupTimer();
      stream.getTracks().forEach((t) => t.stop());
      const duration = Math.round((Date.now() - startedAt.current) / 1000);
      const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
      chunks.current = [];
      if (blob.size === 0) {
        setStatus("idle");
        setError("We didn't catch any audio. Try again or type instead.");
        return;
      }
      setStatus("transcribing");
      try {
        const res = await fetch("/api/luna/transcribe", {
          method: "POST",
          headers: { "Content-Type": blob.type.split(";")[0] },
          body: blob,
        });
        const json = (await res.json()) as { transcript?: string; error?: string };
        if (!res.ok || !json.transcript) throw new Error(json.error ?? "We couldn't hear that clearly.");
        onTranscript(json.transcript, duration);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Voice didn't go through. Try again or type instead.");
      } finally {
        setStatus("idle");
        setSeconds(0);
      }
    };
    startedAt.current = Date.now();
    rec.start();
    setStatus("recording");
    setSeconds(0);
    timer.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAt.current) / 1000);
      setSeconds(s);
      if (s >= MAX_SECONDS) stop();
    }, 250);
  }, [onTranscript, stop]);

  useEffect(
    () => () => {
      cleanupTimer();
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    [],
  );

  return { status, seconds, error, start, stop, maxSeconds: MAX_SECONDS };
}

/** Browser-only capability check; use with useSyncExternalStore (server snapshot: false). */
export function voiceSupported() {
  return !!navigator.mediaDevices?.getUserMedia && pickMimeType() !== null;
}
