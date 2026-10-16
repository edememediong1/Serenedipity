import { SignatureOrb } from "@/components/brand/signature-orb";
import { GUIDE_NAME } from "@/lib/config";

/** "Luna · your focus guide" label. The descriptor always travels with the name. */
export function LunaBadge() {
  return (
    <p className="flex items-center gap-2 type-body-sm text-ink-muted">
      <SignatureOrb size={18} aria-hidden="true" />
      <span>
        <span className="font-semibold text-ink">{GUIDE_NAME}</span> · your AI focus guide
      </span>
    </p>
  );
}

export function LunaDisclaimer() {
  return (
    <p className="text-center type-body-sm text-ink-muted">
      {GUIDE_NAME} is an AI focus guide, not a medical or mental health service.{" "}
      <a
        href="/app/support"
        className="rounded-sm font-semibold text-blue-soft underline underline-offset-4 focus-ring"
      >
        Need support?
      </a>
    </p>
  );
}
