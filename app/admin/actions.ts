"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminResult = { ok: boolean; message: string };

const limit = z
  .union([z.literal(""), z.coerce.number().int().min(0).max(1000)])
  .transform((v) => (v === "" ? null : v));

const SettingsSchema = z.object({
  free_daily_checkins: limit,
  premium_daily_checkins: limit,
  luna_enabled: z.boolean(),
});

export async function saveSettings(input: z.input<typeof SettingsSchema>): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Limits must be whole numbers from 0 to 1000, or blank for unlimited." };
  const admin = createAdminClient();
  const rows = Object.entries(parsed.data).map(([key, value]) => ({
    key: key as "free_daily_checkins" | "premium_daily_checkins" | "luna_enabled",
    // Unlimited is stored as the string "unlimited" (a JSON null would arrive as SQL NULL).
    value: value === null ? "unlimited" : value,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }));
  const { error } = await admin.from("app_settings").upsert(rows);
  if (error) {
    console.error("[admin] settings save failed", error);
    return { ok: false, message: "Couldn't save settings." };
  }
  revalidatePath("/admin/settings");
  return { ok: true, message: "Settings saved. They apply to the next check-in." };
}

const UserUpdate = z.object({
  userId: z.uuid(),
  plan: z.enum(["free", "premium"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

/** Comp a plan or change a role. Billing-managed plans are normally set by the Stripe webhook. */
export async function updateUser(input: z.input<typeof UserUpdate>): Promise<AdminResult> {
  const { user } = await requireAdmin();
  const parsed = UserUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid update." };
  if (parsed.data.userId === user.id && parsed.data.role === "user") {
    return { ok: false, message: "You can't remove your own admin role." };
  }
  const { userId, ...patch } = parsed.data;
  const { error } = await createAdminClient().from("profiles").update(patch).eq("id", userId);
  if (error) return { ok: false, message: "Couldn't update that user." };
  revalidatePath("/admin/users");
  return { ok: true, message: "Updated." };
}
