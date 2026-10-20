import type { Choice, PlayerView } from "@/brains/types";
import { cardStr } from "@/engine/cards";
import { legal, potSize, type Action, type HandState } from "@/engine/hand";

export const STAGES = [1, 2, 4, 8, 16, 32, 64, 100];
export const START_STACK = 500;
export const BLIND_LEVELS: [number, number][] = [[10, 20], [15, 30], [25, 50], [40, 80], [60, 120], [100, 200], [150, 300], [250, 500]];
export const HANDS_PER_LEVEL = 6;
export const PLAYER_ID = "you";
export const SEAT_ID = "jev";

export const blindsFor = (handNo: number): [number, number] => BLIND_LEVELS[Math.min(BLIND_LEVELS.length - 1, Math.floor((handNo - 1) / HANDS_PER_LEVEL))];

export function buildView(h: HandState, i: number, names: Map<string, string>, stage: number, brief = ""): PlayerView {
  const s = h.seats[i];
  const L = legal(h, i);
  return {
    hero: { name: names.get(s.id) ?? s.id, hole: s.hole.map(cardStr), stack: s.stack, bet: s.bet, dealer: h.dealer === i },
    board: h.board.map(cardStr),
    pot: potSize(h),
    toCall: L.toCall,
    canRaise: L.canRaise,
    minRaiseTo: L.minRaiseTo,
    maxRaiseTo: L.maxRaiseTo,
    street: h.street,
    opponents: h.seats.filter((_, j) => j !== i).map((o) => ({ name: names.get(o.id) ?? o.id, stack: o.stack, bet: o.bet, folded: o.folded, allIn: o.allIn, dealer: h.seats.indexOf(o) === h.dealer })),
    activeCount: h.seats.filter((o) => !o.folded).length,
    history: h.log.filter((e) => e.action !== "win").map((e) => `${e.street}: ${names.get(e.seat) ?? e.seat} ${e.action}${e.amount ? ` ${e.amount}` : ""}`),
    blinds: { sb: h.sb, bb: h.bb },
    handNo: h.handNo,
    stage,
    brief,
  };
}

/** Map a council's coarse choice onto a legal engine action. */
export function resolveChoice(h: HandState, i: number, c: Choice): Action {
  const L = legal(h, i);
  const pot = potSize(h);
  const raiseTo = (amt: number) => ({ type: "raise", to: Math.min(L.maxRaiseTo, Math.max(L.minRaiseTo, Math.round(amt))) }) as Action;
  const passive = (): Action => (L.toCall === 0 ? { type: "check" } : { type: "call" });
  switch (c) {
    case "fold": return L.toCall === 0 ? { type: "check" } : { type: "fold" };
    case "check_call": return passive();
    case "raise_small": return L.canRaise ? raiseTo(h.currentBet + (pot + L.toCall) * 0.5) : passive();
    case "raise_big": return L.canRaise ? raiseTo(h.currentBet + (pot + L.toCall)) : passive();
    case "all_in": return L.canRaise ? raiseTo(L.maxRaiseTo) : passive();
  }
}
