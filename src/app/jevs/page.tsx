import type { Metadata } from "next";
import Link from "next/link";
import { Bot } from "@/components/Bot";
import { Mark } from "@/components/Logo";
import { SiteFoot } from "@/components/SiteFoot";
import { ARCHETYPES, firstStageIdx, GUIDE, type Archetype } from "@/game/council";
import { STAGES } from "@/game/run";

export const metadata: Metadata = { title: "Every kind of Jev", description: "The seven temperaments on a Bluff Run council: how each one votes, and how to beat it." };

const ROSTER: Archetype[] = ["plain", "rock", "station", "grinder", "hustler", "maniac", "clock"];

export default function JevsPage() {
  return (
    <div className="page-shell">
      <div className="intro-top">
        <Link href="/" className="brand"><Mark color="var(--accent)" />Bluff Run</Link>
        <nav className="intro-nav"><Link href="/play">Sit at the table</Link></nav>
      </div>
      <section className="loop guide-page">
        <div className="loop-head">
          <h1 className="loop-title">Every kind of Jev</h1>
          <p className="loop-desc">The seat across from you is a council. Each member is one of these seven, with a quirk and a tell seeded on top. This is how they vote, and how to beat them.</p>
        </div>
        <div className="shown">
          <figure>
            <div className="deliberation shown-strip" aria-hidden="true">
              <div className="delib-head num">9 of 16 votes</div>
              {([["fold", "Fold", 4], ["call", "Call", 3], ["raise", "Raise", 2]] as const).map(([k, label, n]) => (
                <div key={k} className={`delib-row ${k}`}><span>{label}</span><div className="delib-bar"><i style={{ width: `${(n / 16) * 100}%` }} /></div><span className="num">{n}</span></div>
              ))}
            </div>
            <figcaption><h3>The vote, in front of you</h3><p>Fold, call and raise fill in as the council decides, then the seat acts. A split vote is a real moment, and you see who carried it.</p></figcaption>
          </figure>
          <figure>
            <div className="shown-members" aria-hidden="true">
              <div className="member"><div className="avatar"><Bot id="shown-a" variant={5} mood="idle" /></div><div className="member-text"><b>Ledger <span>Grinder</span></b><small>three-bettor, timing tell</small></div><div className="member-stat num"><span>Best read</span><strong>hand 7</strong></div></div>
              <div className="member"><div className="avatar"><Bot id="shown-b" variant={6} mood="idle" /></div><div className="member-text"><b>Fuse <span>Maniac</span></b><small>no quirk, no tell</small></div><div className="member-stat num"><span>Against the vote</span><strong>41%</strong></div></div>
            </div>
            <figcaption><h3>The reveal</h3><p>When the run ends you meet every member you faced, how each one voted, and the hand where the minority was right. Then run the same council back.</p></figcaption>
          </figure>
        </div>
        <div className="guide" id="guide">
          <div className="guide-head">
            <h3>How each one votes</h3>
            <p>Seven temperaments, seeded into each council. Each one leans a certain way in the vote, and each has a way to beat it.</p>
          </div>
          <ul className="guide-list" aria-label="Archetypes">
            {ROSTER.map((a) => {
              const g = GUIDE[a], max = Math.max(...g.lean);
              return (
                <li key={a}>
                  <div className="avatar"><Bot id={`land-${a}`} variant={ARCHETYPES[a].shape} mood={g.mood} /></div>
                  <div className="guide-name"><h4>{ARCHETYPES[a].label}</h4><span>{g.style}</span></div>
                  <div className="guide-lean" aria-label={`Leans ${["fold", "call", "raise"][g.lean.indexOf(max)]}`}>
                    {(["fold", "call", "raise"] as const).map((k, i) => <div key={k} className={`delib-row ${k} ${g.lean[i] === max ? "winner" : ""}`}><span>{k[0].toUpperCase() + k.slice(1)}</span><div className="delib-bar"><i style={{ width: `${(g.lean[i] / max) * 100}%` }} /></div></div>)}
                  </div>
                  <p className="guide-read">{ARCHETYPES[a].read}</p>
                  <p className="guide-how">{ARCHETYPES[a].exploit}</p>
                  <span className="guide-from num">from ×{STAGES[firstStageIdx(a)]}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      <SiteFoot />
    </div>
  );
}
