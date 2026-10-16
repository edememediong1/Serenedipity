import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { createGroupRoom, updateGroup } from "@/app/app/groups/actions";
import { GlowBackground } from "@/components/brand/glow-background";
import { Composer } from "@/components/groups/composer";
import { Feed } from "@/components/groups/feed";
import { GroupAdminPanel } from "@/components/groups/group-admin-panel";
import { VISIBILITY_LABEL } from "@/components/groups/group-card";
import { GroupForm } from "@/components/groups/group-form";
import { JoinPanel } from "@/components/groups/join-panel";
import { MemberList } from "@/components/groups/member-list";
import { ModerationQueue } from "@/components/groups/moderation-queue";
import { RoomCard } from "@/components/rooms/room-card";
import { RoomForm } from "@/components/rooms/room-form";
import { GlassCard } from "@/components/ui/glass-card";
import { getFeed, getGroup, getGroupRooms, getMembers, getModerationQueue } from "@/lib/groups/data";
import { TOPICS, type Topic } from "@/lib/groups/rules";
import { listTracks } from "@/lib/rooms/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Study group" };

const TABS = ["feed", "rooms", "members", "about", "moderation"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  feed: "Feed",
  rooms: "Rooms",
  members: "Members",
  about: "About",
  moderation: "Moderation",
};

async function GroupContent({
  params,
  searchParams,
}: {
  params: PageProps<"/app/groups/[slug]">["params"];
  searchParams: PageProps<"/app/groups/[slug]">["searchParams"];
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const data = await getGroup(slug);
  if (!data) notFound();
  const { group, me, role, isMod, userId, profile } = data;
  const member = !!role;
  const frozen = group.status === "frozen";
  const tabs = TABS.filter((t) => (t === "moderation" ? isMod : true));
  const requested =
    typeof sp.tab === "string" && (TABS as readonly string[]).includes(sp.tab) ? (sp.tab as Tab) : null;
  const tab: Tab = requested && tabs.includes(requested) ? requested : member ? "feed" : "about";
  const now = new Date().getTime();
  const muted = !!me?.muted_until && Date.parse(me.muted_until) > now;
  const vis = VISIBILITY_LABEL[group.visibility] ?? VISIBILITY_LABEL.public;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <p className="type-body-sm text-ink-muted">
          {TOPICS[group.topic as Topic] ?? group.topic} · {vis.label} · {group.member_count}{" "}
          {group.member_count === 1 ? "member" : "members"}
        </p>
        <h1 className="type-hero md:text-[56px] md:leading-[58px]">{group.name}</h1>
        {group.description ? (
          <p className="max-w-2xl text-ink-muted md:text-base">{group.description}</p>
        ) : null}
        {frozen ? (
          <p role="status" className="rounded-sm border border-orange/40 px-3 py-2 type-body-sm text-orange">
            This group is paused by the Serenedipity team. You can read it, but posting is off.
          </p>
        ) : null}
        <JoinPanel groupId={group.id} visibility={group.visibility} status={me?.status ?? null} role={role} />
      </header>

      <nav
        aria-label="Group sections"
        className="-mx-6 flex gap-1 overflow-x-auto border-b border-line px-6 md:mx-0 md:px-0"
      >
        {tabs.map((t) => (
          <Link
            key={t}
            href={`/app/groups/${group.slug}?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 type-body-sm focus-ring",
              tab === t ? "border-blue-soft text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {TAB_LABEL[t]}
          </Link>
        ))}
      </nav>

      {tab === "feed" ? (
        member ? (
          <div className="flex max-w-3xl flex-col gap-5">
            {!frozen && !muted ? <Composer groupId={group.id} /> : null}
            {muted ? (
              <p className="text-ink-muted">
                A moderator has paused your posting for a while. You can still read and react.
              </p>
            ) : null}
            <Feed
              posts={await getFeed(group.id)}
              groupId={group.id}
              viewer={{ userId, isMod, canPost: !frozen && !muted }}
              now={now}
            />
          </div>
        ) : (
          <MembersOnly />
        )
      ) : null}

      {tab === "rooms" ? (
        member ? (
          <div className="flex flex-col gap-6">
            <GroupRooms groupId={group.id} timezone={profile.timezone} now={now} />
            {isMod && !frozen ? (
              <section aria-labelledby="new-group-room" className="flex max-w-2xl flex-col gap-3">
                <h2 id="new-group-room" className="type-h3">
                  Schedule a group room
                </h2>
                <GlassCard className="p-5 md:p-6">
                  <RoomForm
                    action={createGroupRoom.bind(null, group.id)}
                    tracks={await listTracks()}
                    mode="group"
                  />
                </GlassCard>
              </section>
            ) : null}
          </div>
        ) : (
          <MembersOnly />
        )
      ) : null}

      {tab === "members" ? (
        member ? (
          <div className="max-w-3xl">
            <MemberList
              members={await getMembers(group.id)}
              groupId={group.id}
              viewerId={userId}
              viewerRole={data.admin ? "owner" : role}
              now={now}
            />
          </div>
        ) : (
          <MembersOnly />
        )
      ) : null}

      {tab === "about" ? (
        <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
          <GlassCard className="flex flex-col gap-3 p-5 md:p-6">
            <h2 className="type-h3">Group rules</h2>
            <p className="whitespace-pre-wrap text-ink-muted">
              {group.rules || "Be kind, keep it on topic, and help each other focus."}
            </p>
            <p className="type-body-sm text-ink-muted">
              Every group also follows the Serenedipity community guidelines. Report anything that breaks
              them; reports are private.
            </p>
            <p className="type-body-sm text-ink-muted">
              Started{" "}
              {new Date(group.created_at).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
            </p>
          </GlassCard>
          {isMod ? (
            <GlassCard className="flex flex-col gap-3 p-5 md:p-6">
              <h2 className="type-h3">Invite people</h2>
              <GroupAdminPanel groupId={group.id} isOwner={role === "owner" || data.admin} />
            </GlassCard>
          ) : null}
          {(role === "owner" || data.admin) && !frozen ? (
            <GlassCard className="flex flex-col gap-3 p-5 md:p-6 lg:col-span-2">
              <h2 className="type-h3">Group settings</h2>
              <GroupForm
                update={updateGroup.bind(null, group.id)}
                initial={{
                  name: group.name,
                  description: group.description ?? "",
                  topic: group.topic as Topic,
                  visibility: group.visibility as "public",
                  rules: group.rules ?? "",
                }}
              />
            </GlassCard>
          ) : null}
        </div>
      ) : null}

      {tab === "moderation" && isMod ? (
        <div className="max-w-3xl">
          <ModerationQueue {...await getModerationQueue(group.id)} now={now} />
        </div>
      ) : null}
    </div>
  );
}

function MembersOnly() {
  return <p className="text-ink-muted">Join the group to see its posts, rooms and members.</p>;
}

async function GroupRooms({
  groupId,
  timezone,
  now,
}: {
  groupId: string;
  timezone: string | null;
  now: number;
}) {
  const rooms = await getGroupRooms(groupId);
  if (!rooms.length)
    return <p className="text-ink-muted">No group rooms yet. Moderators can schedule one below.</p>;
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {rooms.map((r) => (
        <li key={r.id}>
          <RoomCard room={r} now={now} timezone={timezone} />
        </li>
      ))}
    </ul>
  );
}

export default function GroupPage({ params, searchParams }: PageProps<"/app/groups/[slug]">) {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="flex animate-rise-in flex-col gap-4">
        <Link
          href="/app/groups"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-sm type-body-sm text-ink-muted focus-ring hover:text-ink"
        >
          <ArrowLeft className="size-4 stroke-[1.5]" aria-hidden="true" /> All groups
        </Link>
        <Suspense
          fallback={
            <div
              role="status"
              aria-label="Loading the group"
              className="h-96 rounded-lg bg-surface-deep/60"
            />
          }
        >
          <GroupContent params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
