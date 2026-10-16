import type { ReactNode } from "react";
import { Eyebrow } from "@/components/ui/eyebrow";

export function AdminHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="type-h1 md:text-[44px] md:leading-[48px]">{title}</h1>
      </div>
      {children}
    </header>
  );
}

export function AdminSkeleton() {
  return <div role="status" aria-label="Loading" className="h-64 rounded-lg bg-surface-deep/60" />;
}
