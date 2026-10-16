import type { Metadata } from "next";
import { Suspense } from "react";
import { GlowBackground } from "@/components/brand/glow-background";
import { MusicLibrary } from "@/components/music/library";
import { Eyebrow } from "@/components/ui/eyebrow";
import { listAllTracks, listPlaylists } from "@/lib/music/data";

export const metadata: Metadata = { title: "Listen" };

async function Library({ searchParams }: { searchParams: PageProps<"/app/listen">["searchParams"] }) {
  const { state } = await searchParams;
  const initial = state === "focus" || state === "calm" || state === "clear" ? state : "all";
  const [playlists, tracks] = await Promise.all([listPlaylists(), listAllTracks()]);
  return <MusicLibrary playlists={playlists} tracks={tracks} initialFilter={initial} />;
}

/** The music library (PRD 4.1). ?state= preselects Focus, Calm or Clear (from the home screen cards). */
export default function ListenPage({ searchParams }: PageProps<"/app/listen">) {
  return (
    <>
      <GlowBackground />
      <div className="flex animate-rise-in flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Listen</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            Music for every <em>mood</em>
          </h1>
          <p className="max-w-lg text-ink-muted md:text-base">
            Pick how you want to feel. Music keeps playing while you move around the app.
          </p>
        </div>
        <Suspense
          fallback={
            <div role="status" aria-label="Loading music" className="h-96 rounded-lg bg-surface-deep/60" />
          }
        >
          <Library searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
