import Link from "next/link";
import { Sparkles } from "lucide-react";
import { isAdmin } from "@/lib/auth/admin";
import { getSessionProfile } from "@/lib/auth/session";
import { greeting } from "@/lib/greeting";
import { UserMenu } from "./user-menu";

/** Server pieces of the shell that depend on the session. Render each inside <Suspense>. */
export async function UserMenuSlot() {
  const { user, profile } = await getSessionProfile();
  return (
    <UserMenu
      user={{ name: profile.display_name, email: user.email }}
      isAdmin={isAdmin(profile, user.email)}
    />
  );
}

export async function GreetingSlot() {
  const { profile } = await getSessionProfile();
  return <p className="type-h3 text-ink">{greeting(new Date(), profile.timezone, profile.display_name)}</p>;
}

export async function PlanBadgeSlot() {
  const { profile } = await getSessionProfile();
  const premium = profile.plan === "premium";
  return (
    <div className="flex flex-col gap-3 rounded-md p-4 glass">
      <div className="flex items-center justify-between">
        <span className="type-body-sm text-ink-muted">Your plan</span>
        <span className="rounded-pill border border-line px-2.5 py-0.5 type-body-sm text-ink">
          {premium ? "Pro" : "Free"}
        </span>
      </div>
      {premium ? null : (
        // TODO(billing): link to Stripe Checkout once billing ships.
        <Link
          href="/app/upgrade"
          className="inline-flex min-h-11 items-center gap-2 rounded-sm type-body-sm font-semibold text-blue-soft focus-ring hover:underline"
        >
          <Sparkles className="size-4 stroke-[1.5]" aria-hidden="true" /> Upgrade
        </Link>
      )}
    </div>
  );
}
