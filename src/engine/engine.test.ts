// Smallest runnable check: `npm test`. Fails loudly if the evaluator or hand flow breaks.
import assert from "node:assert/strict";
import { parseCard } from "./cards";
import { evaluate } from "./evaluate";
import { act, dealHand, legal, potSize } from "./hand";

const P = (s: string) => s.split(" ").map(parseCard);
const score = (s: string) => evaluate(P(s)).score;

// evaluator ordering
const ranked = [
  "As Ks Qs Js Ts 2d 3c", // royal
  "9h 8h 7h 6h 5h Ad Kc", // straight flush
  "7s 7h 7d 7c Ah 2d 3c", // quads
  "Ks Kh Kd 4c 4h 2d 9c", // full house
  "2s 9s Ks 5s 7s Ad Kc", // flush
  "As 2d 3c 4h 5s Kd Qc", // wheel straight
  "Qs Qh Qd 4c 8h 2d 9c", // trips
  "Js Jh 4d 4c Ah 2d 9c", // two pair
  "Ts Th 4d 6c Ah 2d 9c", // pair
  "As Kh 9d 6c 4h 2d 3c", // high card
];
for (let i = 0; i < ranked.length - 1; i++) assert.ok(score(ranked[i]) > score(ranked[i + 1]), `rank ${i} > ${i + 1}`);
assert.equal(evaluate(P("As Ks Qs Js Ts 2d 3c")).label, "Royal flush");
assert.equal(evaluate(P("As 2d 3c 4h 5s Kd Qc")).label, "Straight, Five high");
assert.equal(evaluate(P("Js Jh 4d 4c Ah 2d 9c")).label, "Two pair, Jacks and Fours");
assert.ok(score("As Kh 9d 6c 4h 2d 3c") > score("As Qh 9d 6c 4h 2d 3c"), "kicker");
assert.ok(score("6s 7h 8d 9c Th 2d 3c") > score("5s 6h 7d 8c 9h 2d 3c"), "higher straight");
assert.ok(score("Ks Kh Kd 4c 4h 2d 9c") > score("Qs Qh Qd Ac Ah 2d 9c"), "full house by trips");
// two trips -> full house with the best pair
assert.equal(evaluate(P("Ks Kh Kd Qc Qh Qd 9c")).label, "Full house, Kings full of Queens");

// heads-up hand: dealer is SB and acts first preflop
let h = dealHand([{ id: "a", stack: 1000 }, { id: "b", stack: 1000 }], 0, 10, 20, 1, seeded(2));
assert.equal(h.seats[0].bet, 10); assert.equal(h.seats[1].bet, 20); assert.equal(h.toAct, 0);
act(h, { type: "call" });
assert.equal(h.toAct, 1, "BB gets the option");
act(h, { type: "check" });
assert.equal(h.street, "flop"); assert.equal(h.board.length, 3); assert.equal(h.toAct, 1, "non-dealer first postflop");
act(h, { type: "raise", to: 60 }); // bet
assert.equal(legal(h).toCall, 60);
act(h, { type: "fold" });
assert.equal(h.street, "done"); assert.equal(h.result!.winners[0].seat, "b"); assert.equal(h.result!.winners[0].amount, 100);
assert.equal(h.seats[1].stack, 1000 - 80 + 100, "winner stack"); // 1020

// side pots: short stack all-in, two others continue; chips conserved
h = dealHand([{ id: "a", stack: 100 }, { id: "b", stack: 1000 }, { id: "c", stack: 1000 }], 0, 10, 20, 2, seeded(3));
assert.equal(h.toAct, 0, "UTG is dealer in 3-handed");
act(h, { type: "raise", to: 100 }); // a all-in
act(h, { type: "raise", to: 300 }); // b
act(h, { type: "call" });           // c
assert.equal(h.street, "flop");
assert.equal(h.toAct, 1, "a is all-in, b acts first");
act(h, { type: "check" }); act(h, { type: "check" });
act(h, { type: "check" }); act(h, { type: "check" });
act(h, { type: "raise", to: 200 }); act(h, { type: "call" });
assert.equal(h.street, "done");
const total = h.seats.reduce((t, s) => t + s.stack, 0);
assert.equal(total, 2100, "chips conserved");
assert.ok(h.seats[0].stack <= 300, "short stack can win at most the main pot");

// a raise reopens action; a short all-in does not
h = dealHand([{ id: "a", stack: 1000 }, { id: "b", stack: 1000 }, { id: "c", stack: 30 }], 0, 10, 20, 3, seeded(4));
// seats: a dealer, b SB, c BB(20, 10 left). a to act.
act(h, { type: "raise", to: 60 });
act(h, { type: "call" }); // b
act(h, { type: "call" }); // c all-in for 30 total -> short, no reopen
assert.equal(h.street, "flop", "short all-in closes the round");

// short-stack blind all-in settles immediately without hanging
h = dealHand([{ id: "a", stack: 10 }, { id: "b", stack: 1990 }], 0, 10, 20, 4, seeded(5));
assert.equal(h.street, "done", "blind all-in runs out board automatically");
assert.equal(h.seats[0].stack + h.seats[1].stack, 2000, "chips conserved on blind all-in");

import { buildCouncil, tally, type Vote } from "@/game/council";
import { decodeRun, encodeRun } from "@/game/share";

// council: deterministic per seed and stage, plain Jev first, pools unlock by stage
const c1 = buildCouncil(4, "A7F3", 16), c2 = buildCouncil(4, "A7F3", 16);
assert.deepEqual(c1.map((m) => m.archetype + m.quirk + m.tell), c2.map((m) => m.archetype + m.quirk + m.tell), "council is seeded");
assert.equal(c1[0].archetype, "plain");
assert.ok(buildCouncil(0, "A7F3", 1).every((m) => m.archetype === "plain" && m.quirk === "none"), "stage 1 is plain");
assert.ok(buildCouncil(1, "A7F3", 2).every((m) => ["plain", "rock", "station"].includes(m.archetype)), "stage 2 pool");

// tally: plurality by group, then the most voted raise size; a tie goes to the heavier probability mass
const v = (member: string, choice: Vote["choice"], p?: Vote["probabilities"]): Vote => ({ member, choice, probabilities: p });
const allowed: Vote["choice"][] = ["fold", "check_call", "raise_small", "raise_big", "all_in"];
let r = tally([v("a", "fold"), v("b", "fold"), v("c", "raise_big"), v("d", "raise_small"), v("e", "raise_small")], allowed);
assert.equal(r.choice, "raise_small"); assert.deepEqual(r.counts, { fold: 2, call: 0, raise: 3 }); assert.deepEqual(r.carriedBy, ["c", "d", "e"]);
r = tally([v("a", "fold", { fold: 0.9, check_call: 0.1 }), v("b", "check_call", { fold: 0.4, check_call: 0.6 })], allowed);
assert.equal(r.choice, "fold", "tie broken by probability mass");
r = tally([v("a", "raise_big")], ["check_call"]);
assert.equal(r.choice, "check_call", "illegal group falls back to a legal choice");

const sampleRun = { seed: "A7F3", daily: 3, stageIdx: 4, cleared: 4, beaten: 15, hands: 48, biggestPot: 900, bestHand: "Full house, Kings full of Tens", bestHandScore: 0, won: false, date: "2026-10-20", bust: { fold: 3, call: 9, raise: 4, choice: "check_call" } };
const decoded = decodeRun(encodeRun(sampleRun));
assert.ok(decoded, "share code decodes");
assert.equal(decoded!.seed, "A7F3"); assert.equal(decoded!.bust!.call, 9); assert.equal(decoded!.bestHand, "Full house, Kings full of Tens");

console.log("engine + game tests ok");

function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
