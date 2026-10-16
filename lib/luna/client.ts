import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { LUNA_SYSTEM_PROMPT } from "./prompt";
import { mockLunaTurn, mockStuck } from "./mock";
import {
  LunaTurnSchema,
  sanitizeTurn,
  StuckSchema,
  type LunaMessage,
  type LunaTurn,
  type StuckTurn,
} from "./schema";

const MODEL = "claude-opus-5-5";

export class LunaUnavailableError extends Error {
  constructor(message = "Luna isn't set up yet.") {
    super(message);
    this.name = "LunaUnavailableError";
  }
}

/** Mock replies are an explicit opt-in for local development and tests (LUNA_MOCK=true). */
export function lunaMode(): "live" | "mock" | "off" {
  if (process.env.LUNA_MOCK === "true") return "mock";
  return process.env.ANTHROPIC_API_KEY ? "live" : "off";
}

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic({ maxRetries: 2, timeout: 60_000 });
  return client;
}

/** A safe turn used when the model declines: no plan, gentle wording, support resources shown. */
const REFUSAL_TURN: LunaTurn = {
  safety: "concern",
  safety_category: "other",
  kind: "support",
  reply:
    "I'm not able to help with that one here. If something heavy is going on, talking to someone you trust, or to one of the free lines below, can really help.",
  mood_summary: "",
  questions: [],
  deadline_iso: null,
  deadline_label: null,
  tasks: [],
  suggest_reset: false,
};

/**
 * One check-in turn. `context` is prepended to the first user message so the system prompt
 * stays byte-identical across requests (prompt caching).
 */
export async function askLuna(history: LunaMessage[], context: string): Promise<LunaTurn> {
  const mode = lunaMode();
  if (mode === "mock") return sanitizeTurn(mockLunaTurn(history));
  if (mode === "off") throw new LunaUnavailableError();

  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m, i) => ({
    role: m.role,
    content: i === 0 ? `${context}\n\n${m.content}` : m.content,
  }));

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    // If the model declines for policy reasons, the API retries on its default fallback model.
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(LunaTurnSchema) },
    system: [{ type: "text", text: LUNA_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages,
  });

  if (response.stop_reason === "refusal") return REFUSAL_TURN;
  if (!response.parsed_output)
    throw new Error(`Luna returned no structured output (stop: ${response.stop_reason}).`);
  return sanitizeTurn(response.parsed_output);
}

const STUCK_SYSTEM = `${LUNA_SYSTEM_PROMPT}

Right now the person is in the middle of a focus block and tapped "I'm stuck". Suggest one smaller, concrete next step they can start in the next minute, with a short estimate in minutes (5 to 25). Reply in one or two warm sentences. If anything they say raises a safety concern, make next_step "Pause and reach out to someone you trust" and keep the reply caring.`;

/** Re-plans one task into a smaller next step (PRD 4.4: re-plan when the user reports "Stuck"). */
export async function askLunaWhenStuck(taskTitle: string, note: string): Promise<StuckTurn> {
  const mode = lunaMode();
  if (mode === "mock") return mockStuck(taskTitle);
  if (mode === "off") throw new LunaUnavailableError();

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: betaZodOutputFormat(StuckSchema) },
    system: [{ type: "text", text: STUCK_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `I'm stuck on: "${taskTitle}".${note ? ` What's in the way: ${note}` : ""}`,
      },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return {
      reply: "Let's make it smaller.",
      next_step: `Spend five minutes writing rough notes for "${taskTitle}"`,
      estimate_minutes: 5,
    };
  }
  const out = response.parsed_output;
  return {
    reply: out.reply.trim().slice(0, 600),
    next_step: out.next_step.trim().slice(0, 200) || "Write one rough sentence to get started",
    estimate_minutes: Math.min(25, Math.max(5, Math.round(out.estimate_minutes / 5) * 5 || 10)),
  };
}
