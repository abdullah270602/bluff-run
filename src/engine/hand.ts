import { Card, newDeck } from "./cards";
import { evaluate } from "./evaluate";

export type Street = "preflop" | "flop" | "turn" | "river" | "done";
export type Action =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; to: number }; // total bet this street

export interface SeatState {
  id: string;
  stack: number;
  bet: number;        // this street
  committed: number;  // this hand
  folded: boolean;
  allIn: boolean;
  acted: boolean;     // acted since last raise this street
  hole: Card[];
}

export interface LogEntry { seat: string; street: Street; action: Action["type"] | "blind" | "win" | "show"; amount?: number; note?: string }

export interface HandResult {
  winners: { seat: string; amount: number; label?: string }[];
  showdown: boolean;
  revealed: string[]; // seat ids whose hole cards are shown
}

export interface HandState {
  seats: SeatState[];
  dealer: number;
  street: Street;
  board: Card[];
  deck: Card[];
  currentBet: number;
  minRaise: number;
  toAct: number; // -1 when nobody
  sb: number;
  bb: number;
  handNo: number;
  log: LogEntry[];
  result?: HandResult;
}

const canAct = (s: SeatState) => !s.folded && !s.allIn;

function nextIndex(h: HandState, from: number, pred: (s: SeatState) => boolean): number {
  const n = h.seats.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    if (pred(h.seats[i])) return i;
  }
  return -1;
}

function post(h: HandState, i: number, amount: number, action: LogEntry["action"]) {
  const s = h.seats[i];
  const a = Math.min(amount, s.stack);
  s.stack -= a; s.bet += a; s.committed += a;
  if (s.stack === 0) s.allIn = true;
  h.log.push({ seat: s.id, street: h.street, action, amount: a });
  return a;
}

/** Start a hand. `seats` must have stack > 0; dealer index refers to this array. */
export function dealHand(
  seats: { id: string; stack: number }[],
  dealer: number,
  sb: number,
  bb: number,
  handNo: number,
  rng: () => number = Math.random,
): HandState {
  const deck = newDeck(rng);
  const h: HandState = {
    seats: seats.map((s) => ({ id: s.id, stack: s.stack, bet: 0, committed: 0, folded: false, allIn: false, acted: false, hole: [deck.pop()!, deck.pop()!] })),
    dealer, street: "preflop", board: [], deck, currentBet: bb, minRaise: bb, toAct: -1, sb, bb, handNo, log: [],
  };
  const n = h.seats.length;
  const sbIdx = n === 2 ? dealer : nextIndex(h, dealer, () => true);
  const bbIdx = nextIndex(h, sbIdx, () => true);
  post(h, sbIdx, sb, "blind");
  post(h, bbIdx, bb, "blind");
  const maxPosted = Math.max(...h.seats.map((s) => s.bet));
  h.currentBet = maxPosted;
  const active = h.seats.filter(canAct);
  if (active.length === 0 || (active.length === 1 && active[0].bet >= maxPosted)) {
    h.toAct = -1;
  } else {
    h.toAct = nextIndex(h, bbIdx, canAct);
  }
  settle(h);
  return h;
}

export interface Legal { toCall: number; canCheck: boolean; canRaise: boolean; minRaiseTo: number; maxRaiseTo: number }

export function legal(h: HandState, i = h.toAct): Legal {
  const s = h.seats[i];
  const toCall = Math.min(h.currentBet - s.bet, s.stack);
  const maxRaiseTo = s.bet + s.stack;
  const minRaiseTo = Math.min(h.currentBet + h.minRaise, maxRaiseTo);
  return { toCall, canCheck: toCall === 0, canRaise: maxRaiseTo > h.currentBet, minRaiseTo, maxRaiseTo };
}

/** Apply an action for the seat to act. Mutates and returns the same state. Throws on illegal action. */
export function act(h: HandState, a: Action): HandState {
  if (h.street === "done" || h.toAct < 0) throw new Error("no action pending");
  const i = h.toAct, s = h.seats[i];
  const L = legal(h, i);
  switch (a.type) {
    case "fold":
      s.folded = true; s.acted = true;
      h.log.push({ seat: s.id, street: h.street, action: "fold" });
      break;
    case "check":
      if (!L.canCheck) throw new Error("cannot check");
      s.acted = true;
      h.log.push({ seat: s.id, street: h.street, action: "check" });
      break;
    case "call":
      if (L.toCall === 0) { s.acted = true; h.log.push({ seat: s.id, street: h.street, action: "check" }); break; }
      post(h, i, L.toCall, "call"); s.acted = true;
      break;
    case "raise": {
      if (!L.canRaise) throw new Error("cannot raise");
      const to = Math.max(Math.min(a.to, L.maxRaiseTo), Math.min(L.minRaiseTo, L.maxRaiseTo));
      const increase = to - h.currentBet;
      post(h, i, to - s.bet, "raise");
      s.acted = true;
      // A short all-in does not reopen action for players who already acted.
      if (increase >= h.minRaise) {
        h.minRaise = increase;
        for (const o of h.seats) if (o !== s) o.acted = false;
      }
      h.currentBet = Math.max(h.currentBet, to);
      break;
    }
  }
  h.toAct = nextIndex(h, i, (o) => canAct(o) && !o.acted);
  settle(h);
  return h;
}

/** Advance streets / finish the hand when no one is left to act. */
function settle(h: HandState) {
  const alive = h.seats.filter((s) => !s.folded);
  if (alive.length === 1) return finish(h, false);
  if (h.toAct >= 0) return;
  // street complete
  const actors = alive.filter((s) => !s.allIn);
  if (h.street === "river" || actors.length <= 1) {
    while (h.board.length < 5) h.board.push(h.deck.pop()!);
    return finish(h, true);
  }
  for (const s of h.seats) { s.bet = 0; s.acted = false; }
  h.currentBet = 0; h.minRaise = h.bb;
  h.street = h.street === "preflop" ? "flop" : h.street === "flop" ? "turn" : "river";
  h.board.push(...(h.street === "flop" ? [h.deck.pop()!, h.deck.pop()!, h.deck.pop()!] : [h.deck.pop()!]));
  h.toAct = nextIndex(h, h.dealer, canAct);
  if (h.toAct < 0) settle(h);
}

function finish(h: HandState, showdown: boolean) {
  h.street = "done"; h.toAct = -1;
  const winners: HandResult["winners"] = [];
  const revealed: string[] = [];
  if (!showdown) {
    const w = h.seats.find((s) => !s.folded)!;
    const amount = h.seats.reduce((t, s) => t + s.committed, 0);
    w.stack += amount;
    winners.push({ seat: w.id, amount });
  } else {
    const scores = new Map<string, { score: number; label: string }>();
    for (const s of h.seats) if (!s.folded) { scores.set(s.id, evaluate(s.hole.concat(h.board))); revealed.push(s.id); }
    const levels = [...new Set(h.seats.map((s) => s.committed).filter((c) => c > 0))].sort((a, b) => a - b);
    let prev = 0;
    const won = new Map<string, number>();
    for (const L of levels) {
      const amount = h.seats.reduce((t, s) => t + Math.max(0, Math.min(s.committed, L) - prev), 0);
      const eligible = h.seats.filter((s) => !s.folded && s.committed >= L);
      if (eligible.length === 1) {
        // Uncalled excess bet is returned directly to the bettor's stack.
        eligible[0].stack += amount;
        prev = L;
        continue;
      }
      const best = Math.max(...eligible.map((s) => scores.get(s.id)!.score));
      const ws = eligible.filter((s) => scores.get(s.id)!.score === best);
      const share = Math.floor(amount / ws.length);
      let odd = amount - share * ws.length;
      // odd chips go to the first winner after the dealer
      const ordered = [...ws].sort((a, b) => ((h.seats.indexOf(a) - h.dealer + h.seats.length) % h.seats.length) - ((h.seats.indexOf(b) - h.dealer + h.seats.length) % h.seats.length));
      for (const w of ordered) { const extra = odd > 0 ? 1 : 0; odd -= extra; won.set(w.id, (won.get(w.id) ?? 0) + share + extra); }
      prev = L;
    }
    for (const s of h.seats) {
      const amt = won.get(s.id);
      if (amt) { s.stack += amt; winners.push({ seat: s.id, amount: amt, label: scores.get(s.id)!.label }); }
    }
  }
  for (const w of winners) h.log.push({ seat: w.seat, street: "done", action: "win", amount: w.amount, note: w.label });
  h.result = { winners, showdown, revealed };
}

export const potSize = (h: HandState) => h.seats.reduce((t, s) => t + s.committed, 0);
/** Seats that still have chips once the hand is done. */
export const liveSeats = (h: HandState) => h.seats.filter((s) => s.stack > 0);
