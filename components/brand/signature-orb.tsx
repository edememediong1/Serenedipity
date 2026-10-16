import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type SignatureOrbProps = ComponentProps<"span"> & {
  /** Diameter in px. */
  size?: number;
  /** Optional centred icon (e.g. a microphone). */
  icon?: ReactNode;
  /** Adds the soft violet halo used on the check-in button. */
  halo?: boolean;
};

/** Blue -> violet -> orange orb (135deg; 0%, 60%, 100%). Used for voice check-in and the logo mark. */
export function SignatureOrb({
  size = 72,
  icon,
  halo = false,
  className,
  style,
  ...props
}: SignatureOrbProps) {
  return (
    <span
      data-slot="signature-orb"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-pill text-on-brand bg-gradient-orb",
        halo && "shadow-[0_10px_30px_rgba(124,77,255,0.40)]",
        "[&_svg]:stroke-[1.5]",
        className,
      )}
      style={{ width: size, height: size, ...style }}
      {...props}
    >
      {icon}
    </span>
  );
}
