import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { GlowBackground } from "@/components/brand/glow-background";
import { AdminNav } from "@/components/admin/admin-nav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false },
};

/** Admin shell. Access is enforced by the proxy (admins only) and again by requireAdmin() in every page and action. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh lg:pl-64">
      <GlowBackground drift={false} />
      <aside className="border-b border-line bg-surface/50 px-4 py-5 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:border-b-0">
        <div className="flex items-center gap-2 px-2 pb-5">
          <Logo href="/admin" size="sm" />
          <span className="rounded-pill border border-line px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            Admin
          </span>
        </div>
        <AdminNav />
      </aside>
      <main id="main" className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
