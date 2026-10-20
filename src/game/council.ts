import type { Choice } from "@/brains/types";

/**
 * The council: every stage, the seat across from you is N Jevs. Each member is seeded with an
 * archetype (sets its bot shape and its style brief), maybe a quirk (one situational habit) and
 * maybe a tell (something the player can read). The seat acts on the vote.
 */
export type Archetype = "plain" | "rock" | "station" | "grinder" | "hustler" | "maniac" | "clock";
export type Quirk = "none" | "river_shutdown" | "blind_stealer" | "trapper" | "scared_money" | "ace_lover" | "three_bet" | "tilt";
export type Tell = "none" | "timing" | "wide_eyes" | "blink";

export interface Member { id: string; name: string; archetype: Archetype; quirk: Quirk; tell: Tell; shape: number }

export const ARCHETYPES: Record<Archetype, { label: string; shape: number; brief: string; read: string; exploit: string }> = {
  plain: { label: "Plain Jev", shape: 0, brief: "", read: "The model with no brief, playing its own game.", exploit: "Bet your good hands. It pays off." },
  rock: { label: "Rock", shape: 4, brief: "Your style is tight and passive. You play very few hands, prefer calling to raising, fold anything marginal, and only raise with a strong made hand.", read: "Tight and passive. Folds most hands, calls only with strength.", exploit: "Steal its blinds. Fold when it finally raises." },
  station: { label: "Station", shape: 7, brief: "Your style is loose and passive. You hate folding. You call most bets to see what happens and almost never raise, even with good hands.", read: "Loose and passive. Calls everything, rarely raises.", exploit: "Stop bluffing. Bet thin for value and size up." },
  grinder: { label: "Grinder", shape: 5, brief: "Your style is tight and aggressive. You play few hands, but when you play you raise or fold rather than call. You value bet firmly and rarely bluff.", read: "Tight and aggressive. Few hands, played hard.", exploit: "Stay balanced. Bluffing it is risky." },
  hustler: { label: "Hustler", shape: 2, brief: "Your style is loose and aggressive. You play many hands, apply pressure with raises, steal pots whenever the opponent shows weakness, and bluff often.", read: "Loose and aggressive. Wide opens, lots of pressure.", exploit: "Call wider, raise for value, find the street it gives up." },
  maniac: { label: "Maniac", shape: 6, brief: "Your style is wild. You raise and go all in far more than the cards justify. Folding feels like losing. You chase draws and bluff relentlessly.", read: "A Hustler with the discipline removed.", exploit: "Tighten before the flop, widen after, let it hang itself." },
  clock: { label: "Clock", shape: 3, brief: "Your style is balanced and patient. You weigh pot odds carefully, mix value bets with the occasional bluff, and avoid big mistakes.", read: "Balanced and patient. The hardest to read.", exploit: "No cheap exploit. Play well." },
};

export const QUIRKS: Record<Quirk, { label: string; brief: string }> = {
  none: { label: "No quirk", brief: "" },
  river_shutdown: { label: "River shutdown", brief: "Habit: you bet the flop and the turn, but if you have been called twice you give up on the river unless you hold a very strong hand." },
  blind_stealer: { label: "Blind stealer", brief: "Habit: when you are the dealer and nobody has raised, you raise with almost any two cards." },
  trapper: { label: "Trapper", brief: "Habit: with a very strong hand you check and call instead of raising, to let the opponent bet into you." },
  scared_money: { label: "Scared money", brief: "Habit: a bet of more than half your stack scares you. You fold to big bets unless you have a monster." },
  ace_lover: { label: "Never folds an ace", brief: "Habit: if you hold an ace you do not fold, whatever the board or the price." },
  three_bet: { label: "Three-bet happy", brief: "Habit: when the opponent raises before the flop, you re-raise most of the time." },
  tilt: { label: "Tilts", brief: "" },
};
export const TILT_BRIEF = "You just lost a big pot and you are tilted: for the next few hands you play loose and aggressive, calling and raising more than you should.";

export const TELLS: Record<Tell, { label: string; read: string }> = {
  none: { label: "No tell", read: "" },
  timing: { label: "Timing", read: "The council takes longer to decide when this member is strong." },
  wide_eyes: { label: "Wide eyes", read: "The seat's eyes widen a beat before it raises." },
  blink: { label: "The blink", read: "The seat blinks before it folds." },
};

const NAMES = ["Granite", "Velvet", "Ledger", "Sprinter", "Fuse", "Meridian", "Cinder", "Moss", "Quill", "Harbor", "Atlas", "Saffron", "Nimbus", "Pepper", "Orbit", "Tally", "Juniper", "Marlow", "Sable", "Keel", "Onyx", "Brook", "Lumen", "Tinder", "Haze", "Pike", "Ember", "Cobalt", "Fennel", "Rook", "Drift", "Gable", "Sorrel", "Flint", "Lark", "Tide", "Birch", "Zephyr", "Vesper", "Crane", "Delta", "Hollow", "Ivory", "Jasper", "Kestrel", "Linden", "Mica", "Noble", "Opal", "Pearl", "Quartz", "Ripple", "Slate", "Thistle", "Umber", "Wren", "Yarrow", "Argon", "Bramble", "Clover"];

/** Which archetypes can appear at a stage (index 0..7), and how the weights lean. */
const POOLS: Record<Archetype, number>[] = [
  { plain: 1, rock: 0, station: 0, grinder: 0, hustler: 0, maniac: 0, clock: 0 },
  { plain: 1, rock: 1, station: 1, grinder: 0, hustler: 0, maniac: 0, clock: 0 },
  { plain: 1, rock: 1, station: 1, grinder: 1.4, hustler: 0, maniac: 0, clock: 0 },
  { plain: 0.8, rock: 1, station: 1, grinder: 1.4, hustler: 1.2, maniac: 0, clock: 0 },
  { plain: 0.6, rock: 1, station: 0.9, grinder: 1.5, hustler: 1.2, maniac: 0.8, clock: 0 },
  { plain: 0.5, rock: 0.9, station: 0.8, grinder: 1.6, hustler: 1.2, maniac: 0.7, clock: 1.2 },
  { plain: 0.4, rock: 0.8, station: 0.6, grinder: 1.9, hustler: 1.1, maniac: 0.6, clock: 1.6 },
  { plain: 0.3, rock: 0.7, station: 0.5, grinder: 2.1, hustler: 1.0, maniac: 0.6, clock: 2.0 },
];
const QUIRK_FROM = 3, TELL_FROM = 4;
const QUIRK_LIST: Quirk[] = ["river_shutdown", "blind_stealer", "trapper", "scared_money", "ace_lover", "three_bet"];
const TELL_LIST: Tell[] = ["timing", "wide_eyes", "blink"];

export function hashSeed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rngFrom(seed: number) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export const newSeed = () => Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, "0");

function pick<T extends string>(weights: Record<T, number>, r: number): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((t, [, w]) => t + w, 0);
  let x = r * total;
  for (const [k, w] of entries) { x -= w; if (x <= 0) return k; }
  return entries[entries.length - 1][0];
}

/** Deterministic council for a stage and seed. Member 0 is always plain Jev. */
export function buildCouncil(stageIdx: number, seed: string, n: number): Member[] {
  const rng = rngFrom(hashSeed(`${seed}:${stageIdx}`));
  const pool = POOLS[Math.min(stageIdx, POOLS.length - 1)];
  const names = [...NAMES].sort(() => rng() - 0.5);
  return Array.from({ length: n }, (_, i) => {
    const archetype: Archetype = i === 0 ? "plain" : pick(pool, rng());
    const quirk: Quirk = i > 0 && stageIdx >= QUIRK_FROM && rng() < 0.45 ? (stageIdx >= 5 && rng() < 0.2 ? "tilt" : QUIRK_LIST[Math.floor(rng() * QUIRK_LIST.length)]) : "none";
    const tell: Tell = i > 0 && stageIdx >= TELL_FROM && rng() < 0.3 ? TELL_LIST[Math.floor(rng() * TELL_LIST.length)] : "none";
    return { id: `m${stageIdx}-${i}`, name: i === 0 ? "Jev" : names[i % names.length], archetype, quirk, tell, shape: ARCHETYPES[archetype].shape };
  });
}

/** The persona paragraph a member reads before the table state. */
export function memberBrief(m: Member, tilted = false): string {
  const parts = [ARCHETYPES[m.archetype].brief, m.quirk === "tilt" ? (tilted ? TILT_BRIEF : "") : QUIRKS[m.quirk].brief].filter(Boolean);
  return parts.join(" ");
}

export interface Vote { member: string; choice: Choice; probabilities?: Partial<Record<Choice, number>> }
export type Group = "fold" | "call" | "raise";
export const groupOf = (c: Choice): Group => (c === "fold" ? "fold" : c === "check_call" ? "call" : "raise");

/** Plurality by group (fold / call / raise), then the most voted raise size. Ties go to the group with more summed probability. */
export function tally(votes: Vote[], allowed: Choice[]): { choice: Choice; counts: Record<Group, number>; carriedBy: string[] } {
  const counts: Record<Group, number> = { fold: 0, call: 0, raise: 0 };
  const mass: Record<Group, number> = { fold: 0, call: 0, raise: 0 };
  const raiseVotes: Record<string, number> = {};
  for (const v of votes) {
    const g = groupOf(v.choice);
    counts[g]++;
    for (const [c, p] of Object.entries(v.probabilities ?? {})) mass[groupOf(c as Choice)] += p ?? 0;
    if (g === "raise") raiseVotes[v.choice] = (raiseVotes[v.choice] ?? 0) + 1;
  }
  const groups = (["fold", "call", "raise"] as Group[]).filter((g) => allowed.some((c) => groupOf(c) === g));
  groups.sort((a, b) => counts[b] - counts[a] || mass[b] - mass[a]);
  const g = groups[0] ?? "call";
  let choice: Choice;
  if (g === "fold") choice = "fold";
  else if (g === "call") choice = "check_call";
  else {
    const sized = (Object.entries(raiseVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "raise_small") as Choice;
    choice = allowed.includes(sized) ? sized : allowed.find((c) => groupOf(c) === "raise") ?? "check_call";
  }
  if (!allowed.includes(choice)) choice = allowed.includes("check_call") ? "check_call" : allowed[0];
  return { choice, counts, carriedBy: votes.filter((v) => groupOf(v.choice) === g).map((v) => v.member) };
}
