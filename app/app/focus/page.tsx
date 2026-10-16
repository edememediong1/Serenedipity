import type { Metadata } from "next";
import { Timer } from "lucide-react";
import { ComingSoon } from "@/components/app/coming-soon";
import { ProgressRing } from "@/components/brand/progress-ring";

export const metadata: Metadata = { title: "Focus" };

// TODO(focus): guided Pomodoro timer (PRD 4.3): start, pause, skip, reset; blocks linked to tasks.
export default function FocusPage() {
  return (
    <ComingSoon
      mood="focus"
      eyebrow="Focus"
      title={
        <>
          One block at a <em>time</em>
        </>
      }
      description="A gentle timer, the task in front of you, and music that changes at breaks."
      icon={Timer}
      upcoming={[
        "Your focus and break lengths, ready to go",
        "Each block linked to a task from your plan",
        "Today's minutes and blocks saved to your history",
      ]}
    >
      <div className="flex justify-center py-4 md:justify-start">
        <ProgressRing
          value={0}
          size={220}
          strokeWidth={8}
          label="Focus timer preview"
          valueText="Not started"
        >
          <span className="text-center">
            <span className="block text-6xl font-extralight tabular-nums">25:00</span>
            <span className="type-body-sm text-ink-muted">Not started</span>
          </span>
        </ProgressRing>
      </div>
    </ComingSoon>
  );
}
