import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Check in" };

// TODO(check-in): voice or text check-in with the focus guide (PRD 4.4), including the safety and support flow (PRD 5).
export default function CheckInPage() {
  return (
    <ComingSoon
      mood="check-in"
      eyebrow="Clarity check-in"
      title={
        <>
          Say how you <em>feel</em>
        </>
      }
      description="Tell your focus guide how you're doing and what's due. It turns that into a plan you can start on."
      icon={MessageCircle}
      upcoming={[
        "Talk or type for about 20 seconds",
        "A short reset when you need one",
        "Small tasks that fit before your deadline, ready to edit",
      ]}
    />
  );
}
