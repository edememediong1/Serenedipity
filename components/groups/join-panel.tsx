"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { joinGroup, leaveGroup } from "@/app/app/groups/actions";
import { Button } from "@/components/ui/button";

/** Join / request / pending / leave, depending on where the viewer stands. */
export function JoinPanel({
  groupId,
  visibility,
  status,
  role,
  code,
}: {
  groupId: string;
  visibility: string;
  status: "active" | "pending" | "banned" | null;
  role: string | null;
  code?: string;
}) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const join = () =>
    start(async () => {
      const res = await joinGroup(groupId, code);
      setMsg({ ok: res.ok, text: res.message ?? "" });
      if (res.ok) {
        if (code && res.slug) router.push(`/app/groups/${res.slug}`);
        else router.refresh();
      }
    });

  if (status === "banned") return <p className="text-ink-muted">You can&apos;t take part in this group.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {status === "active" ? (
        role !== "owner" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await leaveGroup(groupId);
                if (res.ok) router.push("/app/groups");
                else setMsg({ ok: false, text: res.message });
              })
            }
          >
            Leave group
          </Button>
        ) : null
      ) : status === "pending" && !code ? (
        <p role="status" className="type-body-sm text-ink-muted">
          Request sent. A moderator will review it.
        </p>
      ) : (
        <Button onClick={join} disabled={pending}>
          {pending ? "Joining…" : visibility === "request" && !code ? "Ask to join" : "Join group"}
        </Button>
      )}
      {msg ? (
        <p
          role={msg.ok ? "status" : "alert"}
          className={msg.ok ? "type-body-sm text-blue-soft" : "type-body-sm text-orange"}
        >
          {msg.text}{" "}
          {!msg.ok && msg.text.includes("Pro") ? (
            <Link href="/app/upgrade" className="font-semibold underline focus-ring">
              See Pro
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
