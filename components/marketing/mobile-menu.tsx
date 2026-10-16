"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MARKETING_LINKS } from "./nav-links";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" size="icon" className="lg:hidden" aria-label="Open menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="top" aria-describedby={undefined}>
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Site navigation</SheetDescription>
        <Logo href={null} />
        <ul className="flex flex-col">
          {MARKETING_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-md px-1 type-h2 text-ink focus-ring"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3">
          <Button asChild block>
            <Link href="/signup" onClick={() => setOpen(false)}>
              Start free
            </Link>
          </Button>
          <Button asChild variant="secondary" block>
            <Link href="/login" onClick={() => setOpen(false)}>
              Log in
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
