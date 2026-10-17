"use client";

import { useState, useTransition } from "react";
import { saveSettings, type AdminResult } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { GUIDE_NAME } from "@/lib/config";

type Props = {
  free: number | null;
  premium: number | null;
  lunaEnabled: boolean;
  roomCreates: number | null;
  roomJoins: number | null;
};

const asText = (n: number | null) => (n === null ? "" : String(n));
const digits = (v: string) => v.replace(/[^0-9]/g, "");

export function AdminSettingsForm({ free, premium, lunaEnabled, roomCreates, roomJoins }: Props) {
  const [createsVal, setCreates] = useState(asText(roomCreates));
  const [joinsVal, setJoins] = useState(asText(roomJoins));
  const [freeVal, setFree] = useState(free === null ? "" : String(free));
  const [premiumVal, setPremium] = useState(premium === null ? "" : String(premium));
  const [luna, setLuna] = useState(lunaEnabled);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex max-w-2xl flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () =>
          setResult(
            await saveSettings({
              free_daily_checkins: freeVal.trim(),
              premium_daily_checkins: premiumVal.trim(),
              free_daily_room_creates: createsVal.trim(),
              free_daily_room_joins: joinsVal.trim(),
              luna_enabled: luna,
            }),
          ),
        );
      }}
    >
      <GlassCard className="flex flex-col gap-5">
        <div>
          <h2 className="type-h2">Daily check-in limits</h2>
          <p className="text-ink-muted">
            How many new check-ins with {GUIDE_NAME} each person can start per day (their local day).
            Follow-up replies in the same check-in don&apos;t count. Leave blank for unlimited. Admins are
            never limited.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Free plan"
            inputMode="numeric"
            value={freeVal}
            onChange={(e) => setFree(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Unlimited"
            description="PRD default: 1"
          />
          <Input
            label="Pro plan"
            inputMode="numeric"
            value={premiumVal}
            onChange={(e) => setPremium(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="Unlimited"
            description="PRD default: unlimited"
          />
        </div>
      </GlassCard>
      <GlassCard className="flex flex-col gap-5">
        <div>
          <h2 className="type-h2">Free plan room allowance</h2>
          <p className="text-ink-muted">
            Per person, per local day. Creating covers private rooms and group sessions; joining counts each
            different room once a day. Pro members and admins are always unlimited. Leave blank for unlimited.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Rooms created per day"
            inputMode="numeric"
            value={createsVal}
            onChange={(e) => setCreates(digits(e.target.value))}
            placeholder="Unlimited"
            description="Default: 2"
          />
          <Input
            label="Rooms joined per day"
            inputMode="numeric"
            value={joinsVal}
            onChange={(e) => setJoins(digits(e.target.value))}
            placeholder="Unlimited"
            description="Default: 10"
          />
        </div>
      </GlassCard>
      <GlassCard className="flex flex-col gap-3">
        <h2 className="type-h2">{GUIDE_NAME}</h2>
        <div className="flex items-start gap-3">
          <Checkbox
            id="luna-enabled"
            checked={luna}
            onCheckedChange={(c) => setLuna(c === true)}
            className="mt-0.5"
          />
          <label htmlFor="luna-enabled" className="cursor-pointer">
            Check-ins are open
            <span className="block type-body-sm text-ink-muted">
              Turn off to pause new check-ins for everyone except admins (for example, during an incident).
            </span>
          </label>
        </div>
      </GlassCard>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        <p
          aria-live="polite"
          className={result?.ok === false ? "type-body-sm text-critical" : "type-body-sm text-ink"}
        >
          {result?.message}
        </p>
      </div>
    </form>
  );
}
