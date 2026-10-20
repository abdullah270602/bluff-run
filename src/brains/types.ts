import type { Street } from "@/engine/hand";

export type Choice = "fold" | "check_call" | "raise_small" | "raise_big" | "all_in";
export const CHOICES: Choice[] = ["fold", "check_call", "raise_small", "raise_big", "all_in"];

/** The opponent model, reached through OpenRouter. Jev answers a choice question with probabilities. */
export const JEV = { id: "jev", label: "Jev", openrouter: "~typesafe/jev-latest" } as const;

export interface SeatView { name: string; stack: number; bet: number; folded: boolean; allIn: boolean; dealer: boolean }

/** Everything a council member is allowed to know when it is its turn. */
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
  /** The member's persona paragraph; empty for plain Jev. */
  brief: string;
}

export interface Vote { member: string; choice: Choice; probabilities?: Partial<Record<Choice, number>>; timedOut?: boolean }

export interface Decision {
  choice: Choice;
  /** Every member's vote, when the seat was a council. */
  votes?: Vote[];
  counts?: { fold: number; call: number; raise: number };
  carriedBy?: string[];
  /** The model did not answer in time; the seat checked or folded like a player who timed out. */
  timedOut?: boolean;
}

/** Choices that are legal for this view. */
export const allowedChoices = (v: PlayerView): Choice[] =>
  CHOICES.filter((c) => !(c === "fold" && v.toCall === 0) && !((c === "raise_small" || c === "raise_big" || c === "all_in") && !v.canRaise));

/** What a seat does when its model does not answer. */
export const timedOutChoice = (v: PlayerView): Choice => (v.toCall === 0 ? "check_call" : "fold");
