import { z } from "zod";

export const ROOM_SCHEDULES = ["once", "hourly", "daily", "weekdays"] as const;

export const RoomInput = z
  .object({
    title: z.string().trim().min(2, "Give the room a name.").max(80),
    description: z.string().trim().max(280).optional().default(""),
    schedule: z.enum(ROOM_SCHEDULES),
    startsAt: z.iso.datetime({ offset: true, message: "Pick a start time." }),
    sessionMinutes: z.coerce.number().int().min(10).max(180),
    focusMinutes: z.coerce.number().int().min(5).max(120),
    breakMinutes: z.coerce.number().int().min(1).max(30),
    capacity: z.coerce.number().int().min(2).max(50).default(20),
    trackId: z.uuid().nullable().optional(),
  })
  .refine((r) => r.schedule !== "hourly" || r.sessionMinutes <= 60, {
    message: "Hourly rooms can run for up to 60 minutes.",
    path: ["sessionMinutes"],
  })
  .refine((r) => r.focusMinutes <= r.sessionMinutes, {
    message: "The focus block can't be longer than the session.",
    path: ["focusMinutes"],
  });

export type RoomInputValue = z.input<typeof RoomInput>;

export const REPORT_REASONS = {
  harassment: "Harassment or bullying",
  inappropriate_video: "Inappropriate video",
  hate: "Hate or discrimination",
  spam: "Spam",
  underage: "May be under 18",
  other: "Something else",
} as const;

export const ReportInput = z.object({
  roomId: z.uuid(),
  userId: z.uuid(),
  reason: z.enum(
    Object.keys(REPORT_REASONS) as [keyof typeof REPORT_REASONS, ...(keyof typeof REPORT_REASONS)[]],
  ),
  details: z.string().trim().max(500).optional().default(""),
  block: z.boolean().default(true),
});

export const MessageInput = z.object({
  roomId: z.uuid(),
  body: z.string().trim().min(1).max(280),
});
