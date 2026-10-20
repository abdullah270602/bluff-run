import { CHOICE_CRITERIA, describeState } from "./prompt";
import { allowedChoices, JEV, timedOutChoice, type Choice, type PlayerView, type Vote } from "./types";

const KEY = () => process.env.OPENROUTER_API_KEY;
const MOCK = () => process.env.BLUFF_MOCK === "1"; // dev only: persona-flavoured random votes, no network
export const configured = () => Boolean(KEY()) || MOCK();

const headers = () => ({
  Authorization: `Bearer ${KEY()}`,
  "Content-Type": "application/json",
  "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  "X-Title": "Bluff Run",
});

/** One member's vote. Two attempts, then it counts as a timed-out vote (check or fold). */
/** `sampled` draws from the probabilities (council members); a solo Jev acts on its own top choice. */
export async function vote(member: string, v: PlayerView, sampled = true, rng: () => number = Math.random): Promise<Vote> {
  const allowed = allowedChoices(v);
  if (MOCK()) return mockVote(member, v, allowed, sampled, rng);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await systemOne(member, v, allowed, sampled, rng);
    } catch (e) {
      console.warn(`[vote] ${member} attempt ${attempt + 1}: ${(e as Error).message}`);
    }
  }
  return { member, choice: timedOutChoice(v), timedOut: true };
}

async function systemOne(member: string, v: PlayerView, allowed: Choice[], sampled: boolean, rng: () => number): Promise<Vote> {
  const criteria: Record<string, string> = {};
  for (const c of allowed) criteria[c] = CHOICE_CRITERIA[c];
  const res = await fetch("https://openrouter.ai/api/v1/systemone", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: JEV.openrouter,
      state: describeState(v),
      questions: {
        action: {
          type: "choice",
          instructions: "You are playing poker to win chips, in your own style. Which action do you take right now, given your cards, the board, the pot, the price to call and what your opponent has done?",
          criteria,
        },
      },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
  const data = (await res.json()) as { answers: { action: { choice: Choice; probabilities: Record<string, number> } } };
  const probs = data.answers.action.probabilities;
  return { member, choice: pick(probs, allowed, sampled, rng, data.answers.action.choice), probabilities: probs };
}

/** The vote: sampled from the probabilities (sharpened toward the top), or the top choice itself. */
function pick(probs: Record<string, number>, allowed: Choice[], sampled: boolean, rng: () => number, fallback: Choice): Choice {
  const entries = Object.entries(probs).filter(([k]) => allowed.includes(k as Choice)).map(([k, p]) => [k, Math.pow(p, 1.4)] as const);
  let choice: Choice = fallback;
  if (sampled) {
    const total = entries.reduce((t, [, p]) => t + p, 0);
    let r = rng() * total;
    for (const [k, p] of entries) { r -= p; if (r <= 0) { choice = k as Choice; break; } }
  } else if (entries.length) {
    choice = entries.reduce((best, e) => (e[1] > best[1] ? e : best))[0] as Choice;
  }
  return allowed.includes(choice) ? choice : allowed.includes("check_call") ? "check_call" : allowed[0];
}

/** Dev stand-in: weights shaped by the brief so personalities still read without a key. */
function mockVote(member: string, v: PlayerView, allowed: Choice[], sampled: boolean, rng: () => number): Vote {
  const b = v.brief;
  const w: Record<Choice, number> = b.includes("wild") ? { fold: 0.5, check_call: 1, raise_small: 2, raise_big: 2.5, all_in: 1.5 }
    : b.includes("tight and passive") ? { fold: 3, check_call: 2, raise_small: 0.4, raise_big: 0.2, all_in: 0.05 }
    : b.includes("loose and passive") ? { fold: 0.4, check_call: 4, raise_small: 0.4, raise_big: 0.2, all_in: 0.05 }
    : b.includes("tight and aggressive") ? { fold: 2, check_call: 0.6, raise_small: 1.4, raise_big: 1.2, all_in: 0.3 }
    : b.includes("loose and aggressive") ? { fold: 0.8, check_call: 1, raise_small: 1.8, raise_big: 1.4, all_in: 0.5 }
    : b.includes("balanced") ? { fold: 1.2, check_call: 1.6, raise_small: 1, raise_big: 0.6, all_in: 0.1 }
    : { fold: 1, check_call: 1.4, raise_small: 0.9, raise_big: 0.6, all_in: 0.25 };
  const total = allowed.reduce((t, c) => t + w[c], 0);
  const probs: Partial<Record<Choice, number>> = {};
  for (const c of allowed) probs[c] = w[c] / total;
  return { member, choice: pick(probs as Record<string, number>, allowed, sampled, rng, allowed[0]), probabilities: probs };
}
