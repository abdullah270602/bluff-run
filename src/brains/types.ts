import type { Street } from "@/engine/hand";

export type BrainId = "jev" | "claude" | "house";
export type Choice = "fold" | "check_call" | "raise_small" | "raise_big" | "all_in";
export const CHOICES: Choice[] = ["fold", "check_call", "raise_small", "raise_big", "all_in"];

export interface Persona { aggression: number; bluff: number; patience: number }

export interface SeatView { name: string; stack: number; bet: number; folded: boolean; allIn: boolean; dealer: boolean }

/** Everything a brain is allowed to know when it is its turn. */
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

export interface Decision { choice: Choice; brain: BrainId; probabilities?: Partial<Record<Choice, number>>; reason?: string; fallback?: boolean }

export const BRAIN_LABEL: Record<BrainId, string> = { jev: "Jev", claude: "Claude Haiku", house: "House" };
