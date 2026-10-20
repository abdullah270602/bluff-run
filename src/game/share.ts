import { STAGES } from "./run";

/** The run summary that travels in the share link. */
export interface RunStats {
  seed: string;          // council seed, e.g. A7F3 or a daily date code
  daily: number;         // daily number when the seed is a daily one, else 0
  stageIdx: number;      // highest stage index reached (0-based)
  cleared: number;       // stages cleared
  beaten: number;        // Jevs outlasted
  hands: number;
  biggestPot: number;
  bestHand: string;
  bestHandScore: number;
  won: boolean;
  /** The vote that ended the run, when the seat's decision busted the player. */
  bust?: { fold: number; call: number; raise: number; choice: string };
  date: string;
}

export const LAUNCH = Date.UTC(2026, 9, 20);
export const todaySeed = (d = new Date()) => d.toISOString().slice(0, 10).replace(/-/g, "");
export const dailyNumber = (d = new Date()) => Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - LAUNCH) / 86400000) + 1;

export const emptyStats = (seed: string, daily: number): RunStats => ({ seed, daily, stageIdx: 0, cleared: 0, beaten: 0, hands: 0, biggestPot: 0, bestHand: "", bestHandScore: 0, won: false, date: new Date().toISOString().slice(0, 10) });

const b64 = (s: string) => (typeof btoa === "function" ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf8").toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); return typeof atob === "function" ? decodeURIComponent(escape(atob(t))) : Buffer.from(t, "base64").toString("utf8"); };

export function encodeRun(r: RunStats): string {
  return b64(JSON.stringify([2, r.seed, r.daily, r.stageIdx, r.cleared, r.beaten, r.hands, r.biggestPot, r.bestHand, r.won ? 1 : 0, r.date, r.bust ? [r.bust.fold, r.bust.call, r.bust.raise, r.bust.choice] : null]));
}

export function decodeRun(code: string): RunStats | null {
  try {
    const a = JSON.parse(unb64(code));
    if (!Array.isArray(a) || a[0] !== 2) return null;
    const [, seed, daily, stageIdx, cleared, beaten, hands, biggestPot, bestHand, won, date, bust] = a;
    if (typeof stageIdx !== "number" || typeof cleared !== "number") return null;
    return { seed: String(seed), daily: Number(daily) || 0, stageIdx, cleared, beaten, hands, biggestPot, bestHand: String(bestHand ?? ""), bestHandScore: 0, won: won === 1, date: String(date ?? ""), bust: bust ? { fold: bust[0], call: bust[1], raise: bust[2], choice: String(bust[3]) } : undefined };
  } catch { return null; }
}

/** The ladder as eight squares: cleared, the stage you fell on, and the rest. */
export const ladderGlyphs = (r: RunStats) => STAGES.map((_, i) => (i < r.cleared ? "🟩" : i === r.stageIdx && !r.won ? "🟥" : "⬛")).join("");

/** Tweet-sized summary. */
export function shareText(r: RunStats, url: string) {
  const head = r.daily ? `Bluff Run #${r.daily}` : `Bluff Run, council ${r.seed}`;
  const stage = r.won ? "all 8 stages" : `stage ${r.stageIdx + 1} of 8`;
  const how = r.won ? "Outlasted every Jev." : r.bust ? `Outlasted ${r.beaten} Jevs. Busted by a ${Math.max(r.bust.fold, r.bust.call, r.bust.raise)} to ${[r.bust.fold, r.bust.call, r.bust.raise].sort((a, b) => b - a)[1]} vote.` : `Outlasted ${r.beaten} Jevs.`;
  return `${head}, ${stage}\n${ladderGlyphs(r)}\n${how}\nBeat my council: ${url}`;
}
