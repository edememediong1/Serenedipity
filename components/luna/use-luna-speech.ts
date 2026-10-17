"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { estimatedSpeechMs } from "@/lib/luna/spoken";

/**
 * Speaks Luna's replies. Uses the server voice (/api/luna/speak) when it's set up, otherwise the
 * browser's built-in speech. `speak` resolves when she's finished (or was stopped).
 */
export function useLunaSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const done = useRef<(() => void) | null>(null);
  const serverVoice = useRef<boolean | null>(null);

  const finish = useCallback(() => {
    setSpeaking(false);
    const resolve = done.current;
    done.current = null;
    resolve?.();
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    finish();
  }, [finish]);

  const speakWithBrowser = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window)) return resolve();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.97;
        u.pitch = 1.02;
        const voices = window.speechSynthesis.getVoices();
        const preferred = voices.find(
          (v) =>
            /female|samantha|serena|aria|jenny|google uk english female/i.test(v.name) &&
            v.lang.startsWith("en"),
        );
        if (preferred) u.voice = preferred;
        // Some browsers never fire "end"; stop waiting after a reasonable time.
        const safety = window.setTimeout(resolve, estimatedSpeechMs(text));
        u.onend = u.onerror = () => {
          window.clearTimeout(safety);
          resolve();
        };
        window.speechSynthesis.speak(u);
      }),
    [],
  );

  const speak = useCallback(
    async (text: string) => {
      stop();
      if (!text.trim()) return;
      setSpeaking(true);
      const finished = new Promise<void>((resolve) => (done.current = resolve));
      try {
        if (serverVoice.current !== false) {
          const res = await fetch("/api/luna/speak", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
          });
          if (res.ok) {
            serverVoice.current = true;
            const url = URL.createObjectURL(await res.blob());
            const audio = new Audio(url);
            audioRef.current = audio;
            audio.onended = audio.onerror = () => {
              URL.revokeObjectURL(url);
              if (audioRef.current === audio) finish();
            };
            await audio.play();
            return finished;
          }
          if (res.status === 501) serverVoice.current = false;
        }
        await speakWithBrowser(text);
        if (done.current) finish();
      } catch {
        finish();
      }
      return finished;
    },
    [stop, finish, speakWithBrowser],
  );

  useEffect(() => stop, [stop]);
  return { speak, stop, speaking };
}
