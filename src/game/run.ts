import { houseDecide } from "@/brains/house";
import type { BrainId, Choice, Persona, PlayerView } from "@/brains/types";
import { cardStr } from "@/engine/cards";
import { act, dealHand, legal, liveSeats, potSize, type Action, type HandState } from "@/engine/hand";

export const STAGES = [1, 2, 4, 8, 16, 32, 64, 100];
export const START_STACK = 2000;
export const BLIND_LEVELS: [number, number][] = [[10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [250, 500], [400, 800], [600, 1200], [1000, 2000]];
export const HANDS_PER_LEVEL = 8;
export const TABLE_MAX_OPPONENTS = 8; // player + 8 = 9 seats
export const SIM_TABLE_SIZE = 9;
export const PLAYER_ID = "you";

export interface Opponent { id: string; name: string; brain: BrainId; persona: Persona }
export interface Availability { jev: boolean; claude: boolean }

export const blindsFor = (handNo: number): [number, number] => BLIND_LEVELS[Math.min(BLIND_LEVELS.length - 1, Math.floor((handNo - 1) / HANDS_PER_LEVEL))];

function persona(rng: () => number): Persona {
  return { aggression: 0.3 + rng() * 0.5, bluff: 0.05 + rng() * 0.25, patience: 0.2 + rng() * 0.6 };
}

/** Opponents for a stage. Stage 1 is Jev alone; later stages mix whatever models are live. */
export function rosterForStage(stageIdx: number, avail: Availability, rng: () => number = Math.random): Opponent[] {
  const n = STAGES[stageIdx];
  const pool: BrainId[] = [];
  if (avail.jev) pool.push("jev", "jev");
  if (avail.claude) pool.push("claude");
  if (!pool.length) pool.push("house");
  const counts: Record<BrainId, number> = { jev: 0, claude: 0, house: 0 };
  return Array.from({ length: n }, (_, i) => {
    const brain = stageIdx === 0 ? (avail.jev ? "jev" : pool[0]) : pool[i % pool.length];
    counts[brain]++;
    const base = brain === "jev" ? "Jev" : brain === "claude" ? "Haiku" : "House";
    return { id: `${brain}-${stageIdx}-${i}`, name: n === 1 ? base : `${base} ${counts[brain]}`, brain, persona: persona(rng) };
  });
}

/** Split a round's field: the player's table takes the first 8, the rest form background tables of up to 9. */
export function splitRound(opps: Opponent[]): { mine: Opponent[]; others: Opponent[][] } {
  const mine = opps.slice(0, TABLE_MAX_OPPONENTS);
  const rest = opps.slice(TABLE_MAX_OPPONENTS);
  const tables = Math.ceil(rest.length / SIM_TABLE_SIZE);
  const others: Opponent[][] = Array.from({ length: tables }, () => []);
  rest.forEach((o, i) => others[i % tables].push(o));
  return { mine, others };
}

/** Rounds needed to clear a stage of n opponents (for the bracket UI). */
export function roundsForStage(n: number): number {
  let rounds = 0;
  while (n > 0) { const { others } = splitRound(Array.from({ length: n }, (_, i) => ({ id: String(i) } as Opponent))); n = others.length; rounds++; }
  return rounds;
}

export function buildView(h: HandState, i: number, names: Map<string, string>, personas: Map<string, Persona>, stage: number): PlayerView {
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
    opponents: h.seats.filter((_, j) => j !== i).map((o, j) => ({ name: names.get(o.id) ?? o.id, stack: o.stack, bet: o.bet, folded: o.folded, allIn: o.allIn, dealer: h.seats.indexOf(o) === h.dealer })),
    activeCount: h.seats.filter((o) => !o.folded).length,
    history: h.log.filter((e) => e.action !== "win").map((e) => `${e.street}: ${names.get(e.seat) ?? e.seat} ${e.action}${e.amount ? ` ${e.amount}` : ""}`),
    blinds: { sb: h.sb, bb: h.bb },
    handNo: h.handNo,
    stage,
    persona: personas.get(s.id) ?? { aggression: 0.5, bluff: 0.1, patience: 0.5 },
  };
}

/** Map a brain's coarse choice onto a legal engine action. */
export function resolveChoice(h: HandState, i: number, c: Choice): Action {
  const L = legal(h, i);
  const pot = potSize(h);
  const raiseTo = (amt: number) => ({ type: "raise", to: Math.min(L.maxRaiseTo, Math.max(L.minRaiseTo, Math.round(amt))) }) as Action;
  switch (c) {
    case "fold": return L.toCall === 0 ? { type: "check" } : { type: "fold" };
    case "check_call": return L.toCall === 0 ? { type: "check" } : { type: "call" };
    case "raise_small": return L.canRaise ? raiseTo(h.currentBet + (pot + L.toCall) * 0.5) : L.toCall === 0 ? { type: "check" } : { type: "call" };
    case "raise_big": return L.canRaise ? raiseTo(h.currentBet + (pot + L.toCall)) : L.toCall === 0 ? { type: "check" } : { type: "call" };
    case "all_in": return L.canRaise ? raiseTo(L.maxRaiseTo) : L.toCall === 0 ? { type: "check" } : { type: "call" };
  }
}

/** Resolve a background table with the house brain. Returns the winner. */
export function simulateTable(opps: Opponent[], rng: () => number = Math.random): Opponent {
  if (opps.length === 1) return opps[0];
  const names = new Map(opps.map((o) => [o.id, o.name]));
  const personas = new Map(opps.map((o) => [o.id, o.persona]));
  let seats = opps.map((o) => ({ id: o.id, stack: START_STACK }));
  let dealer = 0, handNo = 0;
  while (seats.length > 1 && handNo < 400) {
    handNo++;
    const [sb, bb] = blindsFor(handNo);
    const h = dealHand(seats, dealer % seats.length, sb, bb, handNo, rng);
    let guard = 0;
    while (h.street !== "done" && guard++ < 200) {
      act(h, resolveChoice(h, h.toAct, houseDecide(buildView(h, h.toAct, names, personas, 0), 25, rng)));
    }
    seats = liveSeats(h).map((s) => ({ id: s.id, stack: s.stack }));
    dealer++;
  }
  const winner = seats.sort((a, b) => b.stack - a.stack)[0];
  return opps.find((o) => o.id === winner.id)!;
}
