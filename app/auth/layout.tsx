import { GlowBackground } from "@/components/brand/glow-background";

export default function AuthStatusLayout({ children }: LayoutProps<"/auth">) {
  return (
    <>
      <GlowBackground mood="check-in" />
      {children}
    </>
  );
}
