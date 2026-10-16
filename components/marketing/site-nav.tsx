import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { MobileMenu } from "./mobile-menu";
import { MARKETING_LINKS } from "./nav-links";

export function SiteNav() {
  return (
    <header className="relative z-20">
      <nav aria-label="Main" className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-6">
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {MARKETING_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="inline-flex min-h-11 items-center rounded-md px-3 type-body-sm text-ink-muted focus-ring transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-2 lg:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
        </div>
        <MobileMenu />
      </nav>
    </header>
  );
}
