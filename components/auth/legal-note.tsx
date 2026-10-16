import Link from "next/link";

export function LegalNote() {
  return (
    <p className="text-center type-body-sm text-ink-muted">
      By continuing you agree to our{" "}
      <Link href="/terms" className="rounded-sm underline underline-offset-4 focus-ring hover:text-ink">
        Terms
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="rounded-sm underline underline-offset-4 focus-ring hover:text-ink">
        Privacy policy
      </Link>
      .
    </p>
  );
}
