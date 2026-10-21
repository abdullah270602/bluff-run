"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BEST_RUN_KEY } from "@/components/Arena";
import { Mark } from "@/components/Logo";
import { SiteFoot } from "@/components/SiteFoot";
import { StarButton } from "@/components/StarButton";
import { TableWindow, type SeatVM } from "@/components/TableWindow";
import { parseCard } from "@/engine/cards";
import { HeroDuel } from "@/components/HeroDuel";
import { JevTable } from "@/components/JevTable";
import { encodeRun, type RunStats } from "@/game/share";

const P = (s: string) => parseCard(s);
const demoJev: SeatVM = { id: "jev", name: "Jev", mood: "think", variant: 5, sub: "council of 16", stack: 200, bet: 0, folded: false, allIn: false, out: false, hole: null, status: { text: "Deliberating", tone: "think" }, dealer: false, turn: true, winner: false };
const demoYou: SeatVM = { id: "you", name: "You", mood: "idle", variant: 4, stack: 240, bet: 60, folded: false, allIn: false, out: false, hole: null, status: { text: "Raised to 60", tone: "raise" }, dealer: true, turn: false, winner: false };


export default function Landing() {
  const [best, setBest] = useState<RunStats | null>(null);
  useEffect(() => { try { const raw = localStorage.getItem(BEST_RUN_KEY); if (raw) setBest(JSON.parse(raw)); } catch { /* none */ } }, []);

  return (
    <div className="page-shell">
      <section className="intro">
        <div className="intro-top">
          <span className="brand"><Mark color="var(--accent)" />Bluff Run</span>
          <nav className="intro-nav" aria-label="Page">
            {best && <Link href={`/r/${encodeRun(best)}`}>Best run: stage {best.stageIdx + 1}</Link>}
            <StarButton />
          </nav>
        </div>
        <div className="intro-copy">
          <h1 className="intro-title">How many Jevs can you beat?</h1>
          <p className="intro-sub">Heads-up poker with a council of Jevs that vote on every move. Beat one, and next hand there are two of them in the chair.</p>
          <HeroDuel />
          <Link href="/play" className="pill pill-lime pill-lg">Sit at the table</Link>
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

      <section className="loop" id="council" aria-label="The council">
        <JevTable />
      </section>

      <SiteFoot />
    </div>
  );
}
