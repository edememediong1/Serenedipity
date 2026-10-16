import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 5 * 1024 * 1024; // ~60 seconds of compressed audio
const ALLOWED = /^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a|aac)/;

/**
 * Transcribes a voice note with Deepgram. The audio is streamed straight through and never stored
 * (PRD section 5: transcribe, then delete the audio).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return NextResponse.json({ error: "Sign in to use voice." }, { status: 401 });

  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "Voice isn't set up yet. You can type instead." }, { status: 501 });
  }

  const type = request.headers.get("content-type")?.split(";")[0] ?? "";
  if (!ALLOWED.test(type))
    return NextResponse.json({ error: "That audio format isn't supported." }, { status: 415 });

  const audio = await request.arrayBuffer();
  if (audio.byteLength === 0)
    return NextResponse.json({ error: "We didn't catch any audio." }, { status: 400 });
  if (audio.byteLength > MAX_BYTES)
    return NextResponse.json({ error: "That note is too long. Keep it under a minute." }, { status: 413 });

  const model = process.env.DEEPGRAM_MODEL || "nova-3";
  try {
    const res = await fetch(
      `https://api.deepgram.com/v1/listen?model=${encodeURIComponent(model)}&smart_format=true&punctuate=true`,
      {
        method: "POST",
        headers: { Authorization: `Token ${key}`, "Content-Type": type },
        body: audio,
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!res.ok) {
      console.error("[luna] transcription failed", res.status, await res.text().catch(() => ""));
      return NextResponse.json(
        { error: "We couldn't hear that clearly. Try again or type instead." },
        { status: 502 },
      );
    }
    const json = (await res.json()) as {
      results?: { channels?: { alternatives?: { transcript?: string }[] }[] };
    };
    const transcript = json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
    if (!transcript)
      return NextResponse.json(
        { error: "We didn't catch any words. Try again or type instead." },
        { status: 422 },
      );
    return NextResponse.json({ transcript });
  } catch (error) {
    console.error("[luna] transcription error", error);
    return NextResponse.json(
      { error: "Voice didn't go through. Check your connection and try again." },
      { status: 502 },
    );
  }
}
