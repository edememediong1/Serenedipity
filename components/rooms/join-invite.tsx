"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinRoom } from "@/app/app/rooms/actions";
import { Button } from "@/components/ui/button";

export function JoinInvite({ roomId, code }: { roomId: string; code: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-orange">
          {error}{" "}
          {error.includes("Pro") ? (
            <Link href="/app/upgrade" className="font-semibold underline focus-ring">
              See Pro
            </Link>
          ) : null}
        </p>
      ) : null}
      <Button
        className="w-fit"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await joinRoom(roomId, code);
            if (res.ok) router.push(`/app/rooms/${roomId}`);
            else setError(res.message);
          })
        }
      >
        {pending ? "Joining…" : "Accept invite"}
      </Button>
    </div>
  );
}
