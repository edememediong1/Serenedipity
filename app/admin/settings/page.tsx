import { Suspense } from "react";
import { AdminHeader, AdminSkeleton } from "@/components/admin/page-header";
import { AdminSettingsForm } from "@/components/admin/settings-form";
import { requireAdmin } from "@/lib/auth/admin";
import { getAppSettings } from "@/lib/settings";

export const metadata = { title: "Limits & settings" };

async function SettingsContent() {
  const { supabase } = await requireAdmin();
  const s = await getAppSettings(supabase);
  return (
    <AdminSettingsForm
      free={s.freeDailyCheckins}
      premium={s.premiumDailyCheckins}
      lunaEnabled={s.lunaEnabled}
      roomCreates={s.freeDailyRoomCreates}
      roomJoins={s.freeDailyRoomJoins}
    />
  );
}

export default function AdminSettingsPage() {
  return (
    <>
      <AdminHeader
        eyebrow="Admin"
        title={
          <>
            Limits &amp; <em>settings</em>
          </>
        }
      />
      <Suspense fallback={<AdminSkeleton />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}
