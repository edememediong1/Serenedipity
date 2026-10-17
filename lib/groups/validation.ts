import { z } from "zod";
import { POST_KINDS, REACTIONS, TOPICS } from "./rules";

const keys = <T extends Record<string, unknown>>(o: T) =>
  Object.keys(o) as [keyof T & string, ...(keyof T & string)[]];

export const GroupInput = z.object({
  name: z.string().trim().min(3, "Give the group a name (3 characters or more).").max(60),
  description: z.string().trim().max(500).optional().default(""),
  topic: z.enum(keys(TOPICS)),
  visibility: z.enum(["public", "request", "private"]),
  rules: z.string().trim().max(1000).optional().default(""),
});
export type GroupInputValue = z.input<typeof GroupInput>;

export const PostInput = z.object({
  groupId: z.uuid(),
  kind: z.enum(keys(POST_KINDS)),
  body: z.string().trim().min(1, "Write something first.").max(2000, "Posts can be up to 2,000 characters."),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^https?:\/\/[^\s]+\.[^\s]+/.test(v), "Links need to start with https://"),
});

export const CommentInput = z.object({
  postId: z.uuid(),
  parentId: z.uuid().nullable().optional(),
  body: z
    .string()
    .trim()
    .min(1, "Write something first.")
    .max(1000, "Comments can be up to 1,000 characters."),
});

export const ReactionInput = z.object({ postId: z.uuid(), reaction: z.enum(keys(REACTIONS)) });
