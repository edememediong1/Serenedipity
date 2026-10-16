"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { deleteGroup, getInviteCode } from "@/app/app/groups/actions";
import { Button } from "@/components/ui/button";

/** Invite link (moderators) and delete (owner). */
export function GroupAdminPanel({ groupId, isOwner }: { groupId: string; isOwner: boolean }) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {link ? (
          <>
            <code className="min-w-0 truncate rounded-sm bg-white/[0.06] px-3 py-2 type-body-sm">{link}</code>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
              }}
            >
              <Copy aria-hidden="true" /> {copied ? "Copied" : "Copy"}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await getInviteCode(groupId);
                if (res) setLink(`${window.location.origin}/app/groups/join/${res.code}`);
              })
            }
          >
            Show invite link
          </Button>
        )}
      </div>
      <p className="type-body-sm text-ink-muted">
        Anyone with the invite link can join straight away, even if the group needs approval.
      </p>
      {isOwner ? (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-orange"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Delete this group for everyone? Posts and group rooms will be gone."))
              return;
            start(async () => {
              const res = await deleteGroup(groupId);
              if (res.ok) router.push("/app/groups");
            });
          }}
        >
          Delete group
        </Button>
      ) : null}
    </div>
  );
}
