import { CHOICE_CRITERIA, describeState } from "./prompt";
import { CHOICES, type Choice, type Decision, type PlayerView } from "./types";

const KEY = () => process.env.TYPESAFE_API_KEY || process.env.TYPESAFE_AI_API_KEY;
export const jevAvailable = () => Boolean(KEY());

/** TypeSafe AI "System One" decision call. Samples the action from Jev's probabilities. */
export async function jevDecide(v: PlayerView, rng: () => number = Math.random): Promise<Decision> {
  const criteria: Record<string, string> = {};
  for (const c of CHOICES) {
    if (c === "fold" && v.toCall === 0) continue;
    if ((c === "raise_small" || c === "raise_big" || c === "all_in") && !v.canRaise) continue;
    criteria[c] = CHOICE_CRITERIA[c];
  }
  const res = await fetch("https://api.typesafe.ai/v1/systemone", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.JEV_MODEL || "jev-latest",
      state: describeState(v),
      questions: {
        action: {
          type: "choice",
          instructions: "You are playing poker to win chips. Which action should you take right now, given your cards, the board, the pot, the price to call and your opponents' behaviour?",
          criteria,
        },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`jev ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { answers: { action: { choice: Choice; probabilities: Record<string, number> } } };
  const probs = data.answers.action.probabilities;
  // Sample so the same spot does not always play the same way; sharpen slightly toward the top choice.
  const entries = Object.entries(probs).map(([k, p]) => [k, Math.pow(p, 1.4)] as const);
  const total = entries.reduce((t, [, p]) => t + p, 0);
  let r = rng() * total;
  let choice: Choice = data.answers.action.choice;
  for (const [k, p] of entries) { r -= p; if (r <= 0) { choice = k as Choice; break; } }
  return { choice, brain: "jev", probabilities: probs };
}
