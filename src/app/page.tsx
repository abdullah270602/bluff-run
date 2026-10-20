"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BEST_RUN_KEY } from "@/components/Arena";
import { Bot } from "@/components/Bot";
import { Mark } from "@/components/Logo";
import { TableWindow, type SeatVM } from "@/components/TableWindow";
import { parseCard } from "@/engine/cards";
import { ARCHETYPES, type Archetype } from "@/game/council";
import { STAGES } from "@/game/run";
import { dailyNumber, encodeRun, type RunStats } from "@/game/share";

const P = (s: string) => parseCard(s);
const demoJev: SeatVM = { id: "jev", name: "Jev", mood: "think", variant: 5, sub: "council of 16", stack: 200, bet: 0, folded: false, allIn: false, out: false, hole: null, status: { text: "Deliberating", tone: "think" }, dealer: false, turn: true, winner: false };
const demoYou: SeatVM = { id: "you", name: "You", mood: "idle", variant: 4, stack: 240, bet: 60, folded: false, allIn: false, out: false, hole: null, status: { text: "Raised to 60", tone: "raise" }, dealer: true, turn: false, winner: false };

const CAPTIONS: Record<number, string> = {
  1: "One Jev, no brief, playing its own game. Bet your good hands and it will pay you. Take its last chip to move up.",
  2: "Two votes. The first time the seat can disagree with itself.",
  4: "Four. A Grinder joins: tight, aggressive, hard to bluff.",
  8: "Eight. A Hustler enters and the first quirks appear.",
  16: "Sixteen. A Maniac in the room, and the first tells you can read.",
  32: "Thirty-two. A Clock settles the vote. Someone on the council tilts.",
  64: "Sixty-four, weighted toward the solid ones. The majority rules.",
  100: "A hundred. Every kind of Jev, and the vote never flinches.",
};
const ROSTER: Archetype[] = ["plain", "rock", "station", "grinder", "hustler", "maniac", "clock"];

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
            {best && <Link href={`/r/${encodeRun(best)}`}>Best run: stage {best.stageIdx + 1}</Link>}
          </nav>
        </div>
        <div className="intro-copy">
          <h1 className="intro-title">How many Jevs can you beat?</h1>
          <p className="intro-sub">Heads-up poker against a council of AI players that vote on every move. Beat one, and next hand there are two of them in the chair.</p>
          <Link href="/play" className="pill pill-lime pill-lg">Sit at the table<span className="pill-sub num">Daily council #{dailyNumber()}</span></Link>
        </div>
      </section>

      <section className="showcase" id="table" aria-label="The table">
        <TableWindow
          stage={{ n: 5, hand: 3, cleared: 4 }}
          counter={{ n: 16, name: "Jev" }}
          blinds="10/20"
          pot={160}
          potLabel="Pot"
          potNote="Flop"
          board={[P("As"), P("Qd"), P("8d")]}
          handNo={3}
          seat={demoJev}
          you={demoYou}
          hero={{ hole: [P("9h"), P("Qs")], folded: false, outcome: null, winner: false }}
          deliberation={{ counts: { fold: 4, call: 7, raise: 2 }, total: 16, done: false, allowed: { fold: true, raise: true } }}
          turn={{ text: "The council is voting", progress: 100 }}
          fit={{ min: 0.28 }}
        />
        <Link href="/play" className="showcase-link" aria-label="Sit at the table" />
      </section>

      <section className="loop" id="loop">
        <div className="loop-head">
          <h2 className="loop-title">Beat one, and the council doubles.</h2>
          <p className="loop-desc">Every stage is heads-up. The seat across from you is a council of Jevs, each with its own temperament, each asked the same question. The seat does what the vote says.</p>
        </div>
        <div className="track" role="tablist" aria-label="Stages">
          {STAGES.map((s, i) => <button key={s} type="button" role="tab" aria-selected={i === sel} className={`pill num ${i === sel ? "active" : ""}`} onClick={() => setSel(i)} onMouseEnter={() => setSel(i)}>×{s}</button>)}
        </div>
        <div className="loop-readout">
          <div className="loop-readout-label num">Stage {sel + 1}</div>
          <div className="loop-big num">Jev ×{n}</div>
          <p className="loop-caption">{CAPTIONS[n]}</p>
          <Link href="/play" className="pill">Sit at the table</Link>
        </div>
        <div className="notes">
          <div><h3>The vote, in front of you</h3><p>Fold, call and raise fill in live as the council decides, then the seat acts. A split vote is a real moment, and you can see who carried it.</p></div>
          <div><h3>Every kind of Jev</h3><p>Rocks, stations, grinders, hustlers, maniacs and clocks, with quirks and tells seeded per council. Each one is a real poker type with a real way to beat it.</p></div>
          <div><h3>The reveal</h3><p>When the run ends you see every member you faced, how each one voted, and the hand where the minority was right. Then run the same council back.</p></div>
        </div>
        <ul className="roster" aria-label="Archetypes">
          {ROSTER.map((a) => (
            <li key={a}>
              <div className="avatar-wrap"><div className="avatar"><Bot id={`land-${a}`} variant={ARCHETYPES[a].shape} mood="idle" /></div></div>
              <h3>{ARCHETYPES[a].label}</h3>
              <p>{ARCHETYPES[a].read} <span className="roster-how">{ARCHETYPES[a].exploit}</span></p>
            </li>
          ))}
        </ul>
      </section>

      <footer className="site-foot">
        <span className="brand" style={{ fontSize: 14 }}><Mark size={18} color="var(--accent)" />Bluff Run</span>
        <span>Same council for everyone today. <Link href="/play?council=random">Practice with a random one</Link>.</span>
      </footer>
    </div>
  );
}
