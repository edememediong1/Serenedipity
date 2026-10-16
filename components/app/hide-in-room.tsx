"use client";

import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";

function Gate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Inside a room, the room's shared music replaces the personal player.
  return /^\/app\/rooms\/[0-9a-f-]{36}$/.test(pathname) ? null : children;
}

export function HideInRoom({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={children}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
