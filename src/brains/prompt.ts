import type { PlayerView } from "./types";

/** Plain-language table state a council member reads before it votes. */
export function describeState(v: PlayerView): string {
  const opp = v.opponents
    .map((o) => `${o.name}: ${o.folded ? "folded" : o.allIn ? "all-in" : `${o.stack} chips`}${o.bet ? `, ${o.bet} in front` : ""}${o.dealer ? " (dealer)" : ""}`)
    .join("\n");
  return [
    `No-limit Texas Hold'em, heads-up, stage ${v.stage} of Bluff Run. Hand #${v.handNo}, blinds ${v.blinds.sb}/${v.blinds.bb}.`,
    v.brief ? `You are ${v.hero.name}. ${v.brief}` : `You are ${v.hero.name}.`,
    `Your cards: ${v.hero.hole.join(" ")}. Stack: ${v.hero.stack}${v.hero.dealer ? " (dealer)" : ""}.`,
    `Street: ${v.street}. Board: ${v.board.length ? v.board.join(" ") : "none yet"}. Pot: ${v.pot}.`,
    `To call: ${v.toCall}${v.toCall > 0 ? ` (${(v.toCall / v.blinds.bb).toFixed(1).replace(/\.0$/, "")} big blinds; you need to win ${Math.round((v.toCall / (v.pot + v.toCall)) * 100)}% of the time to break even)` : ""}. ${v.canRaise ? `Min raise to ${v.minRaiseTo}, all-in is ${v.maxRaiseTo}.` : "You cannot raise."}`,
    `Opponent:\n${opp}`,
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
