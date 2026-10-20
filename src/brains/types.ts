import type { Street } from "@/engine/hand";

export type Choice = "fold" | "check_call" | "raise_small" | "raise_big" | "all_in";
export const CHOICES: Choice[] = ["fold", "check_call", "raise_small", "raise_big", "all_in"];

/** Opponent models, all reached through OpenRouter. Jev answers a choice question; the rest answer in JSON. */
export interface ModelSpec { id: string; label: string; short: string; openrouter: string; kind: "systemone" | "chat"; blurb: string }
export const MODELS: ModelSpec[] = [
  { id: "jev", label: "Jev", short: "Jev", openrouter: "~typesafe/jev-latest", kind: "systemone", blurb: "TypeSafe AI's decision model. It answers in milliseconds with a probability for each action, and the seat plays from those odds. It also plays every background table." },
  { id: "haiku", label: "Claude Haiku", short: "Haiku", openrouter: "anthropic/claude-haiku-5.5", kind: "chat", blurb: "Reads the table and picks an action with one line of reasoning. Hover its seat to see why it did what it did." },
  { id: "nano", label: "GPT Nano", short: "Nano", openrouter: "openai/gpt-5.4-nano", kind: "chat", blurb: "OpenAI's smallest current model. Quick, cheap, and prone to the occasional wild bluff." },
  { id: "flash", label: "Gemini Flash Lite", short: "Flash", openrouter: "google/gemini-3.5-flash-lite", kind: "chat", blurb: "Google's lightweight model. Steady, position-aware, and hard to push off a hand." },
];
export const modelById = (id: string) => MODELS.find((m) => m.id === id) ?? MODELS[0];

export interface Persona { aggression: number; bluff: number; patience: number }

export interface SeatView { name: string; stack: number; bet: number; folded: boolean; allIn: boolean; dealer: boolean }

/** Everything a model is allowed to know when it is its turn. */
export interface PlayerView {
  hero: { name: string; hole: string[]; stack: number; bet: number; dealer: boolean };
  board: string[];
  pot: number;
  toCall: number;
  canRaise: boolean;
  minRaiseTo: number;
  maxRaiseTo: number;
  street: Street;
  opponents: SeatView[];
  activeCount: number;
  history: string[];
  blinds: { sb: number; bb: number };
  handNo: number;
  stage: number;
  persona: Persona;
}

export interface Decision {
  choice: Choice;
  model: string;
  probabilities?: Partial<Record<Choice, number>>;
  reason?: string;
  /** The model did not answer in time; the seat checked or folded like a player who timed out. */
  timedOut?: boolean;
}

/** Choices that are legal for this view. */
export const allowedChoices = (v: PlayerView): Choice[] =>
  CHOICES.filter((c) => !(c === "fold" && v.toCall === 0) && !((c === "raise_small" || c === "raise_big" || c === "all_in") && !v.canRaise));

/** What a seat does when its model does not answer. */
export const timedOutDecision = (v: PlayerView, model: string): Decision => ({ choice: v.toCall === 0 ? "check_call" : "fold", model, timedOut: true });
