import { Card, RANK_PLURAL, RANK_WORD, rankOf, suitOf } from "./cards";

export const CATEGORY = [
  "High card", "Pair", "Two pair", "Three of a kind", "Straight",
  "Flush", "Full house", "Four of a kind", "Straight flush",
];

export interface HandValue { score: number; category: number; label: string }

const B = 15; // base for packing kickers (rank values 2..14)
const pack = (cat: number, ks: number[]) => {
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * B + (i < ks.length ? ks[i] + 2 : 0);
  return s;
};

// Highest straight in a 13-bit rank mask, or -1. Returns the top rank (3 = wheel, five high).
function straightHigh(mask: number): number {
  for (let top = 12; top >= 4; top--) {
    if (((mask >> (top - 4)) & 0b11111) === 0b11111) return top;
  }
  if ((mask & 0b1000000001111) === 0b1000000001111) return 3;
  return -1;
}

const topRanks = (mask: number, n: number) => {
  const out: number[] = [];
  for (let r = 12; r >= 0 && out.length < n; r--) if (mask & (1 << r)) out.push(r);
  return out;
};

/** Best 5-card value from 5..7 cards. Higher score wins. */
export function evaluate(cards: Card[]): HandValue {
  const rc = new Array(13).fill(0);
  const sc = new Array(4).fill(0);
  const sm = [0, 0, 0, 0];
  let mask = 0;
  for (const c of cards) {
    const r = rankOf(c), s = suitOf(c);
    rc[r]++; sc[s]++; sm[s] |= 1 << r; mask |= 1 << r;
  }

  for (let s = 0; s < 4; s++) {
    if (sc[s] >= 5) {
      const sh = straightHigh(sm[s]);
      if (sh >= 0) {
        return { score: pack(8, [sh]), category: 8, label: sh === 12 ? "Royal flush" : `Straight flush, ${RANK_WORD[sh]} high` };
      }
      const ks = topRanks(sm[s], 5);
      return { score: pack(5, ks), category: 5, label: `Flush, ${RANK_WORD[ks[0]]} high` };
    }
  }

  let quad = -1;
  const trips: number[] = [], pairs: number[] = [];
  for (let r = 12; r >= 0; r--) {
    if (rc[r] === 4) quad = r;
    else if (rc[r] === 3) trips.push(r);
    else if (rc[r] === 2) pairs.push(r);
  }

  if (quad >= 0) {
    const k = topRanks(mask & ~(1 << quad), 1);
    return { score: pack(7, [quad, ...k]), category: 7, label: `Four ${RANK_PLURAL[quad]}` };
  }
  if (trips.length && (pairs.length || trips.length > 1)) {
    const t = trips[0];
    const p = trips.length > 1 ? Math.max(trips[1], pairs[0] ?? -1) : pairs[0];
    return { score: pack(6, [t, p]), category: 6, label: `Full house, ${RANK_PLURAL[t]} full of ${RANK_PLURAL[p]}` };
  }
  const sh = straightHigh(mask);
  if (sh >= 0) return { score: pack(4, [sh]), category: 4, label: `Straight, ${RANK_WORD[sh]} high` };
  if (trips.length) {
    const t = trips[0];
    const ks = topRanks(mask & ~(1 << t), 2);
    return { score: pack(3, [t, ...ks]), category: 3, label: `Three ${RANK_PLURAL[t]}` };
  }
  if (pairs.length >= 2) {
    const [a, b] = pairs;
    const k = topRanks(mask & ~(1 << a) & ~(1 << b), 1);
    return { score: pack(2, [a, b, ...k]), category: 2, label: `Two pair, ${RANK_PLURAL[a]} and ${RANK_PLURAL[b]}` };
  }
  if (pairs.length === 1) {
    const p = pairs[0];
    const ks = topRanks(mask & ~(1 << p), 3);
    return { score: pack(1, [p, ...ks]), category: 1, label: `Pair of ${RANK_PLURAL[p]}` };
  }
  const ks = topRanks(mask, 5);
  return { score: pack(0, ks), category: 0, label: `${RANK_WORD[ks[0]]} high` };
}

/** Monte Carlo equity of `hole` vs `opponents` random hands given `board`. */
export function equity(hole: Card[], board: Card[], opponents: number, rollouts: number, rng: () => number = Math.random): number {
  const used = new Set([...hole, ...board]);
  const pool: Card[] = [];
  for (let c = 0; c < 52; c++) if (!used.has(c)) pool.push(c);
  const need = 5 - board.length;
  let won = 0;
  for (let i = 0; i < rollouts; i++) {
    const take = need + opponents * 2;
    for (let k = 0; k < take; k++) {
      const j = k + ((rng() * (pool.length - k)) | 0);
      [pool[k], pool[j]] = [pool[j], pool[k]];
    }
    const fullBoard = board.concat(pool.slice(0, need));
    const mine = evaluate(hole.concat(fullBoard)).score;
    let best = mine, ties = 1, beaten = false;
    for (let o = 0; o < opponents; o++) {
      const idx = need + o * 2;
      const s = evaluate([pool[idx], pool[idx + 1]].concat(fullBoard)).score;
      if (s > best) { beaten = true; break; }
      if (s === best) ties++;
    }
    if (!beaten) won += 1 / ties;
  }
  return won / rollouts;
}
