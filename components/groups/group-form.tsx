"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CreateGroupResult, GroupResult } from "@/app/app/groups/actions";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { Input, inputClassName } from "@/components/ui/input";
import { TOPICS, type GroupVisibility, type Topic } from "@/lib/groups/rules";
import type { GroupInputValue } from "@/lib/groups/validation";

const VISIBILITY: { value: GroupVisibility; label: string; description: string }[] = [
  { value: "public", label: "Open", description: "Listed; anyone 18+ can join" },
  { value: "request", label: "Request to join", description: "Listed; moderators approve" },
  { value: "private", label: "Invite only", description: "Hidden; join by link" },
];

/** Create a group, or (with `groupId` + `update`) edit one. */
export function GroupForm({
  create,
  update,
  initial,
}: {
  create?: (input: GroupInputValue) => Promise<CreateGroupResult>;
  update?: (input: GroupInputValue) => Promise<GroupResult>;
  initial?: Partial<GroupInputValue>;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [topic, setTopic] = useState<Topic>((initial?.topic as Topic) ?? "exams");
  const [visibility, setVisibility] = useState<GroupVisibility>(
    (initial?.visibility as GroupVisibility) ?? "public",
  );
  const [rules, setRules] = useState(initial?.rules ?? "");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const input = { name, description, topic, visibility, rules };
    start(async () => {
      if (create) {
        const res = await create(input);
        if (res.ok) router.push(`/app/groups/${res.slug}`);
        else setMessage({ ok: false, text: res.message });
      } else if (update) {
        const res = await update(input);
        setMessage({ ok: res.ok, text: res.ok ? (res.message ?? "Saved.") : res.message });
        if (res.ok) router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <Input
        label="Group name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        required
      />
      <div className="flex flex-col gap-2">
        <label htmlFor="group-description" className="type-body-sm">
          What&apos;s it for? <span className="text-ink-muted">(optional)</span>
        </label>
        <textarea
          id="group-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          className={inputClassName + " py-3"}
        />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 type-body-sm">Topic</legend>
        <ChipGroup
          type="single"
          aria-label="Topic"
          value={topic}
          onValueChange={setTopic}
          options={(Object.keys(TOPICS) as Topic[]).map((t) => ({ value: t, label: TOPICS[t] }))}
        />
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 type-body-sm">Who can join</legend>
        <ChipGroup
          type="single"
          aria-label="Who can join"
          value={visibility}
          onValueChange={setVisibility}
          options={VISIBILITY}
        />
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="group-rules" className="type-body-sm">
          Group rules <span className="text-ink-muted">(shown when people join)</span>
        </label>
        <textarea
          id="group-rules"
          value={rules}
          onChange={(e) => setRules(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="Be kind. Keep it on topic. No spam."
          className={inputClassName + " py-3"}
        />
      </div>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-blue-soft" : "text-orange"}>
          {message.text}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : create ? "Create group" : "Save changes"}
      </Button>
    </form>
  );
}
