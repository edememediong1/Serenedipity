import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/config";
import { CopyrightYear } from "./copyright-year";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo size="sm" />
          <p className="type-body-sm text-ink-muted">
            Music designed for focus, a plan for your day, and company.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center rounded-md px-2 type-body-sm text-ink-muted focus-ring hover:text-ink"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="inline-flex min-h-11 items-center rounded-md px-2 type-body-sm text-ink-muted focus-ring hover:text-ink"
              >
                Terms
              </Link>
            </li>
            <li>
              {/* TODO: replace CONTACT_EMAIL placeholder in lib/config.ts with the real address. */}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex min-h-11 items-center rounded-md px-2 type-body-sm text-ink-muted focus-ring hover:text-ink"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto max-w-6xl px-6 pb-10">
        <p className="type-body-sm text-ink-muted">
          © <CopyrightYear /> {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
