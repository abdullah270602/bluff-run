"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot } from "./Bot";
import { ARCHETYPES, firstStageIdx, GUIDE, type Archetype } from "@/game/council";
import { STAGES } from "@/game/run";

/** Seat order around the rim, left to right over the top of the table. */
const SEATS: Archetype[] = ["rock", "station", "grinder", "plain", "hustler", "maniac", "clock"];
/** Rim angles in degrees: desktop spreads the seats over the top, the phone wraps them around a taller oval. */
const WIDE = [165, 200, 235, 270, 305, 340, 375];
const TALL = [120, 170, 220, 270, 320, 370, 420];

/** The seven kinds of Jev at a casino table. Hover or tap a seat and its read appears on the felt. */
export function JevTable() {
  const [active, setActive] = useState<Archetype | null>(null);
  const [pinned, setPinned] = useState<Archetype | null>(null);
  const shown = active ?? pinned;
  const g = shown ? GUIDE[shown] : null;
  const max = g ? Math.max(...g.lean) : 1;
  return (
    <div className="jev-table-wrap" onMouseLeave={() => setActive(null)}>
      <div className="jev-table" role="group" aria-label="The seven kinds of Jev">
        {SEATS.map((a, i) => (
          <button
            key={a}
            type="button"
            className={`jev-seat ${shown === a ? "active" : ""}`}
            style={{ "--a": `${WIDE[i]}deg`, "--b": `${TALL[i]}deg` } as React.CSSProperties}
            onMouseEnter={() => setActive(a)}
            onFocus={() => setActive(a)}
            onBlur={() => setActive(null)}
            onClick={() => setPinned((p) => (p === a ? null : a))}
            aria-pressed={pinned === a}
            aria-label={`${ARCHETYPES[a].label}: ${ARCHETYPES[a].read} ${ARCHETYPES[a].exploit}`}
          >
            <div className="avatar"><Bot id={`seat-${a}`} variant={ARCHETYPES[a].shape} mood={shown === a ? GUIDE[a].mood : "idle"} /></div>
            <span>{ARCHETYPES[a].label}</span>
          </button>
        ))}
        <div className="jev-you" aria-hidden="true"><i /><span>You</span></div>
        <div className="jev-plate" aria-live="polite">
          {shown && g ? (
            <>
              <h3>{ARCHETYPES[shown].label}<span>{g.style}</span></h3>
              <div className="guide-lean">
                {(["fold", "call", "raise"] as const).map((k, i) => <div key={k} className={`delib-row ${k} ${g.lean[i] === max ? "winner" : ""}`}><span>{k[0].toUpperCase() + k.slice(1)}</span><div className="delib-bar"><i style={{ width: `${(g.lean[i] / max) * 100}%` }} /></div></div>)}
              </div>
              <p>{ARCHETYPES[shown].read}</p>
              <p className="jev-how">{ARCHETYPES[shown].exploit}</p>
              <small className="num">Joins the council from ×{STAGES[firstStageIdx(shown)]}</small>
            </>
          ) : (
            <>
              <h3>Seven kinds of Jev</h3>
              <p>Seeded into every council, each with its own way of voting. Hover a seat to read one.</p>
              <Link href="/jevs" className="jev-link">The full guide</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
