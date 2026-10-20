"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot } from "./Bot";
import { Mark } from "./Logo";
import { ARCHETYPES, firstStageIdx, GUIDE, type Archetype } from "@/game/council";
import { STAGES } from "@/game/run";

/** Seat order around the rim, left to right over the top of the table. */
const SEATS: Archetype[] = ["rock", "station", "grinder", "plain", "hustler", "maniac", "clock"];
/**
 * Eight chairs (seven Jevs and you) at equal distances along the rim. Equal angles on an oval bunch the
 * side seats together, so the angles come from walking the perimeter instead. Starts at the bottom (your seat).
 */
function rimAngles(aspect: number, n = 8): number[] {
  const steps = 2880, b = 1 / aspect, len: number[] = [0];
  for (let i = 1; i <= steps; i++) {
    const t0 = (Math.PI / 2) + ((i - 1) / steps) * 2 * Math.PI, t1 = (Math.PI / 2) + (i / steps) * 2 * Math.PI;
    len.push(len[i - 1] + Math.hypot(Math.cos(t1) - Math.cos(t0), b * (Math.sin(t1) - Math.sin(t0))));
  }
  const total = len[steps];
  return Array.from({ length: n }, (_, k) => {
    const target = (k / n) * total;
    let i = 0; while (len[i] < target) i++;
    return 90 + (i / steps) * 360;
  });
}
const WIDE = rimAngles(2.25).slice(1);
const TALL = rimAngles(0.72).slice(1);

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
        {SEATS.map((a, i) => (
          <div key={`cards-${a}`} className={`jev-cards ${shown === a ? "active" : ""}`} style={{ "--a": `${WIDE[i]}deg`, "--b": `${TALL[i]}deg` } as React.CSSProperties} aria-hidden="true"><i><Mark size={10} /></i><i><Mark size={10} /></i></div>
        ))}
        <div className="jev-you" aria-hidden="true"><i /><span>You</span></div>
        <div className="jev-cards jev-cards-you" style={{ "--a": "90deg", "--b": "90deg" } as React.CSSProperties} aria-hidden="true"><i><Mark size={10} /></i><i><Mark size={10} /></i></div>
        <div className="jev-button num" aria-hidden="true">D</div>
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
