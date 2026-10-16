import { GlowBackground } from "@/components/brand/glow-background";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <GlowBackground mood="check-in" />
      {children}
    </>
  );
}
