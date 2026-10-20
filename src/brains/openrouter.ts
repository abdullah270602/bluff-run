import { CHOICE_CRITERIA, describeState } from "./prompt";
import { allowedChoices, modelById, timedOutDecision, type Choice, type Decision, type ModelSpec, type PlayerView } from "./types";

const KEY = () => process.env.OPENROUTER_API_KEY;
const MOCK = () => process.env.BLUFF_MOCK === "1"; // dev only: random legal actions, no network
export const configured = () => Boolean(KEY()) || MOCK();

const headers = () => ({
  Authorization: `Bearer ${KEY()}`,
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  "X-Title": "Bluff Run",
});

/** Ask a model for an action. Two attempts, then the seat times out (check or fold). */
export async function decide(modelId: string, v: PlayerView, rng: () => number = Math.random): Promise<Decision> {
  const spec = modelById(modelId);
  const allowed = allowedChoices(v);
  if (MOCK()) return { choice: allowed[(rng() * allowed.length) | 0], model: spec.id };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return spec.kind === "systemone" ? await systemOne(spec, v, allowed, rng) : await chat(spec, v, allowed);
    } catch (e) {
      console.warn(`[decide] ${spec.id} attempt ${attempt + 1}: ${(e as Error).message}`);
    }
  }
  return timedOutDecision(v, spec.id);
}

async function systemOne(spec: ModelSpec, v: PlayerView, allowed: Choice[], rng: () => number): Promise<Decision> {
  const criteria: Record<string, string> = {};
  for (const c of allowed) criteria[c] = CHOICE_CRITERIA[c];
  const res = await fetch("https://openrouter.ai/api/v1/systemone", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: spec.openrouter,
      state: describeState(v),
      questions: {
        action: {
          type: "choice",
          instructions: "You are playing poker to win chips. Which action should you take right now, given your cards, the board, the pot, the price to call and what your opponents have done?",
          criteria,
        },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { answers: { action: { choice: Choice; probabilities: Record<string, number> } } };
  const probs = data.answers.action.probabilities;
  // Sample so the same spot does not always play the same way, sharpened toward the top choice.
  const entries = Object.entries(probs).filter(([k]) => allowed.includes(k as Choice)).map(([k, p]) => [k, Math.pow(p, 1.4)] as const);
  const total = entries.reduce((t, [, p]) => t + p, 0);
  let r = rng() * total;
  let choice: Choice = data.answers.action.choice;
  for (const [k, p] of entries) { r -= p; if (r <= 0) { choice = k as Choice; break; } }
  if (!allowed.includes(choice)) choice = allowed.includes("check_call") ? "check_call" : allowed[0];
  return { choice, model: spec.id, probabilities: probs };
}

async function chat(spec: ModelSpec, v: PlayerView, allowed: Choice[]): Promise<Decision> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: spec.openrouter,
      messages: [
        { role: "system", content: `You are a poker opponent in Bluff Run. Play to win chips. Reply with JSON only: {"action": one of ${allowed.map((c) => `"${c}"`).join(", ")}, "reason": one short sentence under 90 characters}.\nActions:\n${allowed.map((c) => `- ${c}: ${CHOICE_CRITERIA[c]}`).join("\n")}` },
        { role: "user", content: describeState(v) },
      ],
      response_format: { type: "json_object" },
      reasoning: { effort: "low" },
      max_tokens: 400,
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = data.choices?.[0]?.message?.content ?? "";
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error(`no JSON in reply: ${text.slice(0, 80)}`);
  const parsed = JSON.parse(json) as { action: Choice; reason?: string };
  if (!allowed.includes(parsed.action)) throw new Error(`illegal action ${parsed.action}`);
  return { choice: parsed.action, model: spec.id, reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 120) : undefined };
}
