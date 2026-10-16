import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { GlowBackground } from "@/components/brand/glow-background";
import { BreakNote } from "@/components/games/break-note";
import { GAMES, getGame } from "@/components/games/catalog";
import { GlassCard } from "@/components/ui/glass-card";

export function generateStaticParams() {
  return GAMES.map((g) => ({ game: g.id }));
}

export async function generateMetadata({ params }: PageProps<"/app/games/[game]">): Promise<Metadata> {
  const game = getGame((await params).game);
  return { title: game?.name ?? "Games" };
}

async function Game({ params }: { params: PageProps<"/app/games/[game]">["params"] }) {
  const game = getGame((await params).game);
  if (!game) notFound();
  const { Component } = game;
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="type-h1 md:text-[48px] md:leading-[52px]">{game.name}</h1>
        <p className="text-ink-muted">{game.blurb}</p>
        <BreakNote />
      </div>
      <GlassCard className="p-5 md:p-8">
        <Component />
      </GlassCard>
    </>
  );
}

export default function GamePage({ params }: PageProps<"/app/games/[game]">) {
  return (
    <>
      <GlowBackground mood="finish" />
      <div className="mx-auto flex max-w-2xl animate-rise-in flex-col gap-6">
        <Link
          href="/app/games"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm text-ink-muted focus-ring hover:text-ink"
        >
          <ArrowLeft className="size-4 stroke-[1.5]" aria-hidden="true" /> All games
        </Link>
        <Suspense
          fallback={
            <div role="status" aria-label="Loading the game" className="h-96 rounded-lg bg-surface-deep/60" />
          }
        >
          <Game params={params} />
        </Suspense>
      </div>
    </>
  );
}
