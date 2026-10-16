import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Search } from "lucide-react";
import { GlowBackground } from "@/components/brand/glow-background";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { GlassCard } from "@/components/ui/glass-card";
import { listGroups } from "@/lib/groups/data";
import { TOPICS, type Topic } from "@/lib/groups/rules";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Study groups" };

async function Groups({ searchParams }: { searchParams: PageProps<"/app/groups">["searchParams"] }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 60) : "";
  const topic = typeof sp.topic === "string" && sp.topic in TOPICS ? (sp.topic as Topic) : undefined;
  const { mine, discover, canCreate } = await listGroups({ q, topic });
  const topicHref = (t?: Topic) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (t) params.set("topic", t);
    const s = params.toString();
    return `/app/groups${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="mine-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="mine-heading" className="type-h2">
            Your groups
          </h2>
          {canCreate ? (
            <Button asChild size="sm">
              <Link href="/app/groups/new">
                <Plus aria-hidden="true" /> Start a group
              </Link>
            </Button>
          ) : null}
        </div>
        {mine.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {mine.map((g) => (
              <li key={g.id}>
                <GroupCard
                  group={g}
                  badge={
                    g.status === "pending"
                      ? "Requested"
                      : g.role === "owner"
                        ? "Owner"
                        : g.role === "moderator"
                          ? "Moderator"
                          : undefined
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">You haven&apos;t joined a group yet. Find one below.</p>
        )}
        {!canCreate ? (
          <GlassCard className="flex flex-wrap items-center gap-4 p-5">
            <p className="min-w-0 flex-1 text-ink-muted">Pro members can start their own study groups.</p>
            <Button asChild variant="secondary" size="sm">
              <Link href="/app/upgrade">See Pro</Link>
            </Button>
          </GlassCard>
        ) : null}
      </section>

      <section aria-labelledby="discover-heading" className="flex flex-col gap-4">
        <h2 id="discover-heading" className="type-h2">
          Discover
        </h2>
        <form role="search" className="flex max-w-lg gap-2">
          {topic ? <input type="hidden" name="topic" value={topic} /> : null}
          <label htmlFor="group-search" className="sr-only">
            Search groups
          </label>
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 stroke-[1.5] text-ink-muted"
              aria-hidden="true"
            />
            <input
              id="group-search"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Search groups"
              className="h-11 w-full rounded-pill border border-line bg-surface-glass pr-4 pl-11 text-ink focus-ring placeholder:text-ink-muted"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
        <nav aria-label="Topics" className="flex flex-wrap gap-2">
          {[undefined, ...(Object.keys(TOPICS) as Topic[])].map((t) => (
            <Link
              key={t ?? "all"}
              href={topicHref(t)}
              aria-current={topic === t ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-pill border px-4 type-body-sm focus-ring",
                topic === t
                  ? "border-transparent bg-white/[0.12] text-ink"
                  : "border-line text-ink-muted hover:text-ink",
              )}
            >
              {t ? TOPICS[t] : "All topics"}
            </Link>
          ))}
        </nav>
        {discover.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {discover.map((g) => (
              <li key={g.id}>
                <GroupCard group={g} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-muted">
            {q || topic ? "No groups match that yet." : "No groups to discover yet."}
          </p>
        )}
      </section>
    </div>
  );
}

export default function GroupsPage({ searchParams }: PageProps<"/app/groups">) {
  return (
    <>
      <GlowBackground mood="rooms" />
      <div className="flex animate-rise-in flex-col gap-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Study groups</Eyebrow>
          <h1 className="type-hero md:text-[60px] md:leading-[62px]">
            Better <em>together</em>
          </h1>
          <p className="max-w-lg text-ink-muted md:text-base">
            Find people working toward the same thing. Share progress, ask questions and focus in group rooms.
          </p>
        </div>
        <Suspense
          fallback={
            <div role="status" aria-label="Loading groups" className="h-72 rounded-lg bg-surface-deep/60" />
          }
        >
          <Groups searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
