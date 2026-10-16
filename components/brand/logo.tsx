import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";
import { SignatureOrb } from "./signature-orb";

type LogoProps = {
  /** Link target. Pass null to render without a link. */
  href?: string | null;
  size?: "sm" | "md";
  className?: string;
};

/** Wordmark plus the signature orb mark. Reads APP_NAME so a rename is one change. */
export function Logo({ href = "/", size = "md", className }: LogoProps) {
  const content = (
    <>
      <SignatureOrb size={size === "sm" ? 20 : 24} aria-hidden="true" />
      <span
        className={cn("font-display leading-none text-ink", size === "sm" ? "text-[22px]" : "text-[26px]")}
      >
        {APP_NAME}
      </span>
    </>
  );
  const cls = cn("inline-flex items-center gap-2", className);

  if (href === null) {
    return <span className={cls}>{content}</span>;
  }
  return (
    <Link href={href} className={cn(cls, "min-h-11 rounded-md focus-ring")} aria-label={`${APP_NAME} home`}>
      {content}
    </Link>
  );
}
