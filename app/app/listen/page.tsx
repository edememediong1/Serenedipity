import type { Metadata } from "next";
import { Library } from "lucide-react";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Listen" };

// TODO(player): music library and player (PRD 4.1). Reads ?state= to preselect Focus, Calm or Clear.
export default function ListenPage() {
  return (
    <ComingSoon
      mood="default"
      eyebrow="Listen"
      title={
        <>
          Music for every <em>mood</em>
        </>
      }
      description="Browse mixes by how you want to feel and what you're working on."
      icon={Library}
      upcoming={[
        "Deep Focus, Calm Mind, Clear the Fog, Creative Flow and Wind Down",
        "Piano, jazz, lofi, Afro lounge, ambient and binaural styles",
        "Favourites, playlists and a sleep timer",
      ]}
    />
  );
}
