import type { PlayerView } from "./types";

/** Plain-language table state shared by the Jev and Claude brains. */
export function describeState(v: PlayerView): string {
  const opp = v.opponents
    .map((o) => `${o.name}: ${o.folded ? "folded" : o.allIn ? "all-in" : `${o.stack} chips`}${o.bet ? `, ${o.bet} in front` : ""}${o.dealer ? " (dealer)" : ""}`)
    .join("\n");
  const style = v.persona.aggression > 0.6 ? "aggressive" : v.persona.aggression < 0.4 ? "cautious" : "balanced";
  return [
    `No-limit Texas Hold'em, stage ${v.stage} of Bluff Run. Hand #${v.handNo}, blinds ${v.blinds.sb}/${v.blinds.bb}.`,
    `You are ${v.hero.name}, a ${style} player. Your cards: ${v.hero.hole.join(" ")}. Stack: ${v.hero.stack}${v.hero.dealer ? " (dealer)" : ""}.`,
    `Street: ${v.street}. Board: ${v.board.length ? v.board.join(" ") : "none yet"}. Pot: ${v.pot}. Players still in: ${v.activeCount}.`,
    `To call: ${v.toCall}. ${v.canRaise ? `Min raise to ${v.minRaiseTo}, all-in is ${v.maxRaiseTo}.` : "You cannot raise."}`,
    `Opponents:\n${opp}`,
    `Action so far this hand:\n${v.history.length ? v.history.join("\n") : "none"}`,
  ].join("\n\n");
}

export const CHOICE_CRITERIA = {
  fold: "Give up the hand. Only sensible when there is a bet to call and the hand is weak for the price.",
  check_call: "Stay in without raising: check if nothing to call, otherwise call the current bet.",
  raise_small: "Raise about half the pot. Builds the pot or applies light pressure.",
  raise_big: "Raise about the full pot. Strong hand or a committed bluff.",
  all_in: "Bet the entire stack. Maximum pressure; commits everything.",
} as const;
