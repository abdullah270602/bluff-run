export interface RunStats {
  stageIdx: number;      // highest stage index reached (0-based)
  cleared: number;       // stages cleared
  beaten: number;        // opponents eliminated across the run
  hands: number;
  biggestPot: number;
  bestHand: string;
  bestHandScore: number;
  won: boolean;          // cleared all stages
  date: string;          // ISO date
}

export const emptyStats = (): RunStats => ({ stageIdx: 0, cleared: 0, beaten: 0, hands: 0, biggestPot: 0, bestHand: "", bestHandScore: 0, won: false, date: new Date().toISOString().slice(0, 10) });

const b64 = (s: string) => (typeof btoa === "function" ? btoa(s) : Buffer.from(s, "utf8").toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64 = (s: string) => { const t = s.replace(/-/g, "+").replace(/_/g, "/"); return typeof atob === "function" ? atob(t) : Buffer.from(t, "base64").toString("utf8"); };

export function encodeRun(r: RunStats): string {
  return b64(JSON.stringify([r.stageIdx, r.cleared, r.beaten, r.hands, r.biggestPot, r.bestHand, r.won ? 1 : 0, r.date]));
}

export function decodeRun(code: string): RunStats | null {
  try {
    const [stageIdx, cleared, beaten, hands, biggestPot, bestHand, won, date] = JSON.parse(unb64(code));
    if (typeof stageIdx !== "number" || typeof cleared !== "number") return null;
    return { stageIdx, cleared, beaten, hands, biggestPot, bestHand: String(bestHand ?? ""), bestHandScore: 0, won: won === 1, date: String(date ?? "") };
  } catch { return null; }
}
