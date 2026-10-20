"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BEST_RUN_KEY } from "@/components/Arena";
import { Mark } from "@/components/Logo";
import { TableWindow, type SeatVM } from "@/components/TableWindow";
import { parseCard } from "@/engine/cards";
import { type Opponent, splitRound, STAGES } from "@/game/run";
import { encodeRun, type RunStats } from "@/game/share";

const P = (s: string) => parseCard(s);
const demoSeats: SeatVM[] = [
  { id: "jev", name: "Jev", model: "jev", persona: { aggression: 0.58, bluff: 0.14, patience: 0.4 }, mood: "idle", variant: 2, stack: 1840, bet: 60, folded: false, allIn: false, out: false, hole: null, status: { text: "Called", tone: "call" }, dealer: false, turn: false, winner: false },
];
const demoYou: SeatVM = { id: "you", name: "You", model: "you", persona: { aggression: 1, bluff: 0, patience: 0 }, mood: "idle", variant: 4, stack: 1940, bet: 60, folded: false, allIn: false, out: false, hole: null, status: null, dealer: true, turn: true, winner: false };

function rounds(n: number) {
  const rows: { seats: number; others: number; tables: number }[] = [];
  let field = n;
  while (field > 0) {
    const { mine, others } = splitRound(Array.from({ length: field }, (_, i) => ({ id: String(i) }) as Opponent));
    rows.push({ seats: mine.length, others: field - mine.length, tables: others.length });
    field = others.length;
  }
  return rows;
}

function caption(n: number) {
  const r = rounds(n);
  if (n === 1) return "One table. You and Jev, heads-up, 500 chips each with the blinds climbing every six hands. Take the last chip to move up.";
  if (r.length === 1) return `One table, you and ${n} Jevs. Each one plays its own style. Take every chip to move up.`;
  return `${r.length} rounds. You and ${r[0].seats} at your table, ${r[0].others} more on ${r[0].tables} other ${r[0].tables === 1 ? "table" : "tables"} that Jev plays at the same time. Their winners come back for you.`;
}

export default function Landing() {
  const [sel, setSel] = useState(0);
  const [best, setBest] = useState<RunStats | null>(null);
  useEffect(() => { try { const raw = localStorage.getItem(BEST_RUN_KEY); if (raw) setBest(JSON.parse(raw)); } catch { /* none */ } }, []);
  const n = STAGES[sel];

  return (
    <div className="page-shell">
      <section className="intro">
        <div className="intro-top">
          <span className="brand"><Mark color="var(--accent)" />Bluff Run</span>
          <nav className="intro-nav" aria-label="Page">
            <a href="#table">Table</a>
            <a href="#loop">How it works</a>
            {best && <Link href={`/r/${encodeRun(best)}`}>Best run: stage {STAGES[best.stageIdx]}</Link>}
          </nav>
        </div>
        <div className="intro-copy">
          <h1 className="intro-title">How many AI opponents can you beat?</h1>
          <p className="intro-sub">Poker against Jev, an AI that reads your bets. Beat one, and the count doubles every round.</p>
          <Link href="/play" className="pill pill-lime pill-lg">Sit at the table<span className="pill-sub num">1 to 100</span></Link>
        </div>
      </section>

      <section className="showcase" id="table" aria-label="The table">
        <TableWindow
          stage={{ n: 1, hand: 7, cleared: 0 }}
          counter={{ n: 1, name: "Jev" }}
          blinds="10/20"
          pot={180}
          potLabel="Pot"
          potNote="Flop"
          board={[P("As"), P("Qd"), P("8d")]}
          handNo={7}
          seats={demoSeats}
          you={demoYou}
          hero={{ hole: [P("9h"), P("Qs")], folded: false, outcome: null, winner: false }}
          turn={{ text: "Your turn", progress: 100, gold: true }}
          fit={{ min: 0.28 }}
          actions={<><span className="text-btn text-fold">Fold<span className="key">F</span></span><span className="text-btn text-raise">Raise<span className="key">R</span></span><span className="text-btn">Call 60<span className="key">C</span></span></>}
        />
        <Link href="/play" className="showcase-link" aria-label="Sit at the table" />
      </section>

      <section className="loop" id="loop">
        <div className="loop-head">
          <h2 className="loop-title">Beat one, and the count doubles.</h2>
          <p className="loop-desc">The table stays the same. Every time you clear it, the number of opponents waiting for you doubles.</p>
        </div>
        <div className="track" role="tablist" aria-label="Stages">
          {STAGES.map((s, i) => <button key={s} type="button" role="tab" aria-selected={i === sel} className={`pill num ${i === sel ? "active" : ""}`} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)}>{s}</button>)}
        </div>
        <div className="loop-readout">
          <div className="loop-readout-label num">Stage {sel + 1}</div>
          <div className="loop-big num">{n} {n === 1 ? "opponent" : "opponents"}</div>
          <p className="loop-caption">{caption(n)}</p>
          <Link href="/play" className="pill">Sit at the table</Link>
        </div>
        <div className="notes">
          <div><h3>Real decisions</h3><p>Jev is TypeSafe AI's decision model. It sees the same table you do, weighs fold, call and raise, and plays from those odds. After the run, open any hand and see what it was thinking.</p></div>
          <div><h3>The doubling loop</h3><p>1, 2, 4, 8, 16, 32, 64, then 100. Stacks reset to 500 each stage, blinds rise every six hands, and one bust ends the run.</p></div>
          <div><h3>Past eight, a shootout</h3><p>A table seats nine. Larger fields split into tables that Jev plays while you play yours, and the winners come back to face you.</p></div>
        </div>
      </section>

      <footer className="site-foot">
        <span className="brand" style={{ fontSize: 14 }}><Mark size={18} color="var(--accent)" />Bluff Run</span>
        <span>How far can you go against AI?</span>
      </footer>
    </div>
  );
}
