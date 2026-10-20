import Anthropic from "@anthropic-ai/sdk";
import { CHOICE_CRITERIA, describeState } from "./prompt";
import { CHOICES, type Choice, type Decision, type PlayerView } from "./types";

export const claudeAvailable = () => Boolean(process.env.ANTHROPIC_API_KEY);
let client: Anthropic | null = null;

/** Claude Haiku 5.5 picks an action as structured JSON. "Lightweight model" per the brief; override with CLAUDE_MODEL. */
export async function claudeDecide(v: PlayerView): Promise<Decision> {
  client ??= new Anthropic({ timeout: 10_000, maxRetries: 1 });
  const allowed = CHOICES.filter((c) => !(c === "fold" && v.toCall === 0) && !((c === "raise_small" || c === "raise_big" || c === "all_in") && !v.canRaise));
  const res = await client.messages.create({
    model: process.env.CLAUDE_MODEL || "claude-haiku-5-5",
    max_tokens: 300,
    output_config: {
      effort: "low",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            reason: { type: "string", description: "One short sentence, under 90 characters." },
            action: { type: "string", enum: allowed },
          },
          required: ["action", "reason"],
          additionalProperties: false,
        },
      },
    },
    system: `You are a poker opponent in Bluff Run. Play to win chips. Actions:\n${allowed.map((c) => `- ${c}: ${CHOICE_CRITERIA[c]}`).join("\n")}`,
    messages: [{ role: "user", content: describeState(v) }],
  });
  if (res.stop_reason === "refusal") throw new Error("claude refused");
  const text = res.content.find((b) => b.type === "text")?.text ?? "";
  const parsed = JSON.parse(text) as { action: Choice; reason: string };
  if (!allowed.includes(parsed.action)) throw new Error(`claude bad action ${parsed.action}`);
  return { choice: parsed.action, brain: "claude", reason: parsed.reason };
}
