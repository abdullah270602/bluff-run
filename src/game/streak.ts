/** Days played in a row on the daily council, kept in the browser. */
export interface Streak { last: string; days: number; bestSeed?: string; bestStage?: number }

const KEY = "bluff-run:days";

const dayBefore = (ymd: string) => {
  const d = new Date(Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8)) - 1));
  return d.toISOString().slice(0, 10).replace(/-/g, "");
};

export function readStreak(): Streak | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Streak) : null; } catch { return null; }
}

const write = (s: Streak) => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* no storage */ } };

/** Count today. A day after yesterday extends the streak; anything older starts a new one. */
export function markPlayed(today: string): Streak {
  const prev = readStreak();
  const next: Streak = !prev ? { last: today, days: 1 }
    : prev.last === today ? prev
    : prev.last === dayBefore(today) ? { ...prev, last: today, days: prev.days + 1 }
    : { ...prev, last: today, days: 1 };
  write(next);
  return next;
}

/** The highest stage reached today (1-based). */
export function noteBest(today: string, stage: number) {
  const prev = readStreak() ?? { last: today, days: 1 };
  if (prev.bestSeed === today && (prev.bestStage ?? 0) >= stage) return;
  write({ ...prev, bestSeed: today, bestStage: stage });
}

/** What the landing page says about the streak, or nothing when there is nothing to say. */
export function streakLine(s: Streak | null, today: string): string | null {
  if (!s) return null;
  if (s.last === today) return `Day ${s.days} of your streak.${s.bestSeed === today && s.bestStage ? ` Best today: stage ${s.bestStage}.` : ""}`;
  if (s.last === dayBefore(today)) return `Day ${s.days} yesterday. Play today to keep the streak.`;
  return null;
}
