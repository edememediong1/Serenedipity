"use client";

import { useState } from "react";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { cn } from "@/lib/utils";

const moods = ["default", "focus", "check-in", "rooms"] as const;

export function GlowDemo() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {moods.map((mood) => (
        <div key={mood} className="relative h-48 overflow-hidden rounded-lg border border-line">
          {/* Local (non-fixed) copy of the glow layer for previewing each mood. */}
          <div className={cn("glow-layer inset-0!")} data-mood={mood} aria-hidden="true" />
          <span className="relative type-body-sm m-3 inline-block">{mood}</span>
        </div>
      ))}
    </div>
  );
}

export function ChipDemo() {
  const [single, setSingle] = useState<string | null>("25");
  const [multi, setMulti] = useState<string[]>(["piano", "lofi"]);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Chip>Foggy</Chip>
        <Chip>Stressed</Chip>
        <Chip>Deadline today</Chip>
        <Chip>Ready</Chip>
      </div>
      <p id="len-label" className="type-body-sm text-ink-muted">
        Single select (radiogroup, arrow keys)
      </p>
      <ChipGroup
        type="single"
        aria-labelledby="len-label"
        value={single}
        onValueChange={setSingle}
        options={[
          { value: "25", label: "25 min" },
          { value: "50", label: "50 min" },
          { value: "90", label: "90 min" },
        ]}
      />
      <p id="sound-label" className="type-body-sm text-ink-muted">
        Multi select (toggle buttons)
      </p>
      <ChipGroup
        type="multiple"
        aria-labelledby="sound-label"
        value={multi}
        onValueChange={setMulti}
        options={[
          { value: "piano", label: "Piano" },
          { value: "jazz", label: "Jazz" },
          { value: "lofi", label: "Lofi" },
          { value: "ambient", label: "Ambient" },
        ]}
      />
    </div>
  );
}
