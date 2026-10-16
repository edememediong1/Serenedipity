import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckInExperience } from "@/components/luna/check-in-experience";
import { GlowBackground } from "@/components/brand/glow-background";
import { getSessionProfile } from "@/lib/auth/session";
import { GUIDE_NAME } from "@/lib/config";

export const metadata: Metadata = { title: `Check in with ${GUIDE_NAME}` };

async function CheckInLoader({ searchParams }: { searchParams: PageProps<"/app/check-in">["searchParams"] }) {
  const params = await searchParams;
  const { profile } = await getSessionProfile();
  const mood = typeof params.mood === "string" ? params.mood : null;
  return <CheckInExperience mood={mood} breakMinutes={profile.default_break_minutes} />;
}

export default function CheckInPage({ searchParams }: PageProps<"/app/check-in">) {
  return (
    <>
      <GlowBackground mood="check-in" />
      <Suspense
        fallback={
          <div role="status" aria-label="Loading check-in" className="mx-auto flex max-w-2xl flex-col gap-4">
            <div className="h-4 w-32 rounded-sm bg-surface-deep" />
            <div className="h-20 w-3/4 rounded-md bg-surface-deep" />
          </div>
        }
      >
        <CheckInLoader searchParams={searchParams} />
      </Suspense>
    </>
  );
}
