import { parseCard, rankOf, suitOf } from "@/engine/cards";
import { equity } from "@/engine/evaluate";
import type { Choice, PlayerView } from "./types";

/** Chen formula, normalised to 0..1. */
export function preflopStrength(hole: string[]): number {
  const [a, b] = hole.map(parseCard);
  const r1 = Math.max(rankOf(a), rankOf(b)), r2 = Math.min(rankOf(a), rankOf(b));
  const pts = (r: number) => (r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2);
  let s = pts(r1);
  if (r1 === r2) s = Math.max(5, s * 2);
  if (suitOf(a) === suitOf(b)) s += 2;
  const gap = r1 - r2;
  if (r1 !== r2) s -= gap === 1 ? 0 : gap === 2 ? 1 : gap === 3 ? 2 : gap === 4 ? 4 : 5;
  if (gap <= 1 && r1 < 10 && r1 !== r2) s += 1;
  return Math.max(0, Math.min(1, s / 20));
}

/**
 * Heuristic opponent. `rollouts` controls Monte Carlo cost (use ~25 for background tables).
 * ponytail: no range modelling or opponent reads; add if the house brain feels exploitable.
 */
export function houseDecide(v: PlayerView, rollouts = 120, rng: () => number = Math.random): Choice {
  const { aggression, bluff, patience } = v.persona;
  const opps = Math.max(1, Math.min(3, v.activeCount - 1));
  const strength = v.street === "preflop"
    ? preflopStrength(v.hero.hole)
    : equity(v.hero.hole.map(parseCard), v.board.map(parseCard), opps, rollouts, rng);
  // multiway preflop hands need more to continue
  const need = v.street === "preflop" ? 0.32 + patience * 0.1 + (v.activeCount - 2) * 0.03 : 0;
  const potOdds = v.toCall / (v.pot + v.toCall || 1);
  const shortStack = v.hero.stack <= v.blinds.bb * 10;

  if (v.toCall === 0) {
    if (shortStack && strength > 0.45) return "all_in";
    if (strength > 0.68 - aggression * 0.12) return rng() < aggression ? "raise_big" : "raise_small";
    if (strength > 0.5 && rng() < aggression * 0.6) return "raise_small";
    if (rng() < bluff * (v.street === "preflop" ? 0.5 : 1)) return "raise_small";
    return "check_call";
  }

  if (v.street === "preflop") {
    if (strength < need) return rng() < bluff * 0.3 && potOdds < 0.15 ? "check_call" : "fold";
    if (shortStack && strength > 0.5) return "all_in";
    if (strength > 0.8 && rng() < aggression) return "raise_big";
    if (strength > 0.6 && rng() < aggression * 0.7) return "raise_small";
    return "check_call";
  }

  const margin = 0.04 + patience * 0.06;
  if (strength < potOdds + margin) {
    // occasional float with a cheap call
    return potOdds < 0.12 && rng() < bluff ? "check_call" : "fold";
  }
  if (strength > 0.85) return rng() < aggression + 0.2 ? "raise_big" : "check_call";
  if (strength > 0.7 && rng() < aggression) return "raise_small";
  return "check_call";
}
