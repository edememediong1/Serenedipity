import { Suspense } from "react";
import { AdminHeader, AdminSkeleton } from "@/components/admin/page-header";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { GlassCard } from "@/components/ui/glass-card";
import { listUsers } from "@/lib/admin/data";

export const metadata = { title: "Users" };

const date = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Never";

async function UsersTable({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const all = await listUsers(search);
  const PER_PAGE = 50;
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(params.page) || 1));
  const users = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageHref = (n: number) =>
    `/admin/users?${new URLSearchParams({ ...(search ? { q: search } : {}), page: String(n) })}`;
  return (
    <div className="flex flex-col gap-4">
      <form role="search" className="flex gap-2">
        <label htmlFor="user-search" className="sr-only">
          Search users by email or name
        </label>
        <input
          id="user-search"
          name="q"
          defaultValue={search}
          placeholder="Search by email or name"
          className="min-h-11 w-full max-w-sm rounded-sm border border-line bg-surface-deep px-3 text-ink focus-ring placeholder:text-ink-muted"
        />
        <button type="submit" className="min-h-11 rounded-md border border-line px-4 type-body-sm focus-ring">
          Search
        </button>
      </form>
      <p className="type-body-sm text-ink-muted">
        {all.length} {all.length === 1 ? "user" : "users"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>
      <GlassCard padding="none" className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left type-body-sm">
          <thead className="text-ink-muted">
            <tr className="border-b border-line">
              <th scope="col" className="px-4 py-3 font-semibold">
                User
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Joined
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Last sign-in
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Check-ins (7d)
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                Focus min (7d)
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Billing
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                Plan · role
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <span className="block text-ink">{u.name || "No name"}</span>
                  <span className="block text-ink-muted">{u.email}</span>
                  {!u.onboarded ? <span className="text-ink-muted">Onboarding not finished</span> : null}
                </td>
                <td className="px-4 py-3 text-ink-muted">{date(u.joined)}</td>
                <td className="px-4 py-3 text-ink-muted">{date(u.lastSignIn)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.checkins7d}</td>
                <td className="px-4 py-3 text-right tabular-nums">{u.focusMinutes7d}</td>
                <td className="px-4 py-3 text-ink-muted">{u.subscription ?? "None"}</td>
                <td className="px-4 py-3">
                  <UserRowActions userId={u.id} plan={u.plan} role={u.role} email={u.email} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
      {pages > 1 ? (
        <nav aria-label="Pages" className="flex gap-2">
          {page > 1 ? (
            <a
              href={pageHref(page - 1)}
              className="inline-flex min-h-11 items-center rounded-md border border-line px-4 type-body-sm focus-ring"
            >
              Previous
            </a>
          ) : null}
          {page < pages ? (
            <a
              href={pageHref(page + 1)}
              className="inline-flex min-h-11 items-center rounded-md border border-line px-4 type-body-sm focus-ring"
            >
              Next
            </a>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <>
      <AdminHeader
        eyebrow="Admin"
        title={
          <>
            Everyone, <em>at a glance</em>
          </>
        }
      />
      <Suspense fallback={<AdminSkeleton />}>
        <UsersTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}
