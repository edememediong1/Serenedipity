import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/app/coming-soon";

export const metadata: Metadata = { title: "Rooms" };

// TODO(rooms): scheduled focus rooms (PRD 4.5): synced music, shared blocks, report and block, 18+.
export default function RoomsPage() {
  return (
    <ComingSoon
      mood="rooms"
      eyebrow="Focus rooms"
      title={
        <>
          Focus <em>together</em>
        </>
      }
      description="Scheduled sessions with quiet company. Everyone hears the same music and works through the same blocks."
      icon={Users}
      upcoming={[
        "Rooms at set times, like a morning session or an hourly sprint",
        "Mic and camera off by default; turning them on is your choice",
        "Report and block always one tap away",
      ]}
    />
  );
}
