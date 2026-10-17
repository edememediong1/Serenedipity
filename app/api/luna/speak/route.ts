import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ text: z.string().trim().min(1).max(1200) });

// Best-effort per-instance limiter so the voice can't be used as a general text-to-speech service.
const WINDOW_MS = 10 * 60_000;
const MAX_REQUESTS = 40;
const recent = new Map<string, number[]>();
function limited(userId: string, now = Date.now()) {
  const times = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(userId, times);
  return times.length > MAX_REQUESTS;
}

/**
 * Luna's voice: turns one of her replies into speech with Deepgram Aura (same key as transcription).
 * Returns 501 when voice output isn't configured; the app then falls back to the browser's own voice.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sign in to use voice." }, { status: 401 });

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key || process.env.LUNA_MOCK === "true")
    return NextResponse.json(
      { error: "Voice replies use your device's voice.", fallback: true },
      { status: 501 },
    );

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Nothing to say." }, { status: 400 });
  if (limited(userId))
    return NextResponse.json({ error: "Luna needs a short pause.", fallback: true }, { status: 429 });

  const model = process.env.DEEPGRAM_TTS_MODEL || "aura-2-luna-en";
  try {
    const res = await fetch(
      `https://api.deepgram.com/v1/speak?model=${encodeURIComponent(model)}&encoding=mp3`,
      {
        method: "POST",
        headers: { Authorization: `Token ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: parsed.data.text }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok || !res.body) {
      console.error("[luna] speech failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json(
        { error: "Voice isn't available right now.", fallback: true },
        { status: 502 },
      );
    }
    return new Response(res.body, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("[luna] speech error", error);
    return NextResponse.json({ error: "Voice isn't available right now.", fallback: true }, { status: 502 });
  }
}
