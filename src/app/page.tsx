"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "@/components/Logo";
import { PlayingCard } from "@/components/PlayingCard";
import { BEST_RUN_STORAGE_KEY } from "@/components/PokerArena";
import { parseCard } from "@/engine/cards";
import { roundsForStage, START_STACK, STAGES } from "@/game/run";
import { encodeRun, type RunStats } from "@/game/share";

interface StageMeta {
  stage: number;
  title: string;
  format: string;
  roster: string;
  blurb: string;
  cards: [string, string];
}

const STAGE_DOSSIER: StageMeta[] = [
  {
    stage: 1,
    title: "The Gatekeeper",
    format: "Heads-up · 1 table · 1 round",
    roster: "Jev (1v1)",
    blurb: "Pure heads-up No-Limit Hold'em against Jev. Every pot shifts the balance directly between your stack and the AI's.",
    cards: ["As", "Ks"],
  },
  {
    stage: 2,
    title: "Three-Handed Triangle",
    format: "3-handed · 1 table · 1 round",
    roster: "Jev + Claude Haiku",
    blurb: "Blind pressure accelerates. Position rotates every three hands while two distinct AI models contest your button.",
    cards: ["Qh", "Qd"],
  },
  {
    stage: 4,
    title: "Five-Max Pressure",
    format: "5-handed · 1 table · 1 round",
    roster: "Jev × 2 · Claude Haiku · House",
    blurb: "Short-handed dynamics where wide opens and 3-bet bluffs collide. Survive all four AI stacks to clear the table.",
    cards: ["Jh", "Th"],
  },
  {
    stage: 8,
    title: "Full Ring Finale",
    format: "9-handed · 1 table · 1 round",
    roster: "Full 8-AI table mix",
    blurb: "The maximum capacity of a single poker table: you against eight AI personalities across 18,000 total chips.",
    cards: ["Ac", "Ad"],
  },
  {
    stage: 16,
    title: "Two-Table Shootout",
    format: "2 tables · 2 rounds · 34,000 chips",
    roster: "8 at your table + 8 on Table B",
    blurb: "The field overflows a single table. Clear your 9-handed table while 8 AIs battle in parallel, then duel the survivor heads-up.",
    cards: ["Kd", "Qd"],
  },
  {
    stage: 32,
    title: "Four-Table Bracket",
    format: "4 tables · 2 rounds · 66,000 chips",
    roster: "8 at your table + 24 across 3 tables",
    blurb: "Three background tables resolve concurrently. Win your table to enter a 4-handed final table against the three other table champions.",
    cards: ["9s", "9c"],
  },
  {
    stage: 64,
    title: "Eight-Table Gauntlet",
    format: "8 tables · 2 rounds · 130,000 chips",
    roster: "8 at your table + 56 across 7 tables",
    blurb: "Seven parallel tables feed their sole survivors into an 8-handed champions' table. Zero margin for a mistimed all-in.",
    cards: ["Ah", "5h"],
  },
  {
    stage: 100,
    title: "The Century Run",
    format: "12 tables · 3 rounds · 202,000 chips",
    roster: "100 AI opponents · 3-round tournament",
    blurb: "Beat your opening table of 8 while 92 AIs battle across 11 tables. Survive Round 2's semifinal to reach the final heads-up championship.",
    cards: ["As", "Ah"],
  },
];

export default function LandingPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [bestRun, setBestRun] = useState<RunStats | null>(null);
  const [avail, setAvail] = useState<{ jev: boolean; claude: boolean } | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BEST_RUN_STORAGE_KEY);
      if (raw) setBestRun(JSON.parse(raw) as RunStats);
    } catch {
      // ignore
    }
    fetch("/api/decide")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setAvail(d);
      })
      .catch(() => {});
  }, []);

  const activeStage = STAGE_DOSSIER[selectedIdx];
  const activeRounds = roundsForStage(activeStage.stage);

  return (
    <div className="landing-shell">
      {/* Top Navigation */}
      <header className="site-nav">
        <Logo />

        <div className="nav-right">
          <div className="model-status-pill" title="Active AI Decision Engines">
            <span className="status-dot" />
            <span>
              {avail?.jev || avail?.claude
                ? [avail.jev && "Jev", avail.claude && "Claude Haiku", "House"].filter(Boolean).join(" · ")
                : "Jev · Claude · House Engine"}
            </span>
          </div>

          {bestRun && (
            <Link href={`/r/${encodeRun(bestRun)}`} className="best-run-pill num">
              <span>Best: Stage {STAGES[bestRun.stageIdx]}</span>
              <strong>{bestRun.beaten} beaten ↗</strong>
            </Link>
          )}

          <Link href="/play" className="btn btn-primary btn-sm">
            Start Run →
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="landing-main">
        <section className="hero-grid">
          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="hero-kicker">
              <span className="kicker-pip" />
              <span>NO-LIMIT TEXAS HOLD&apos;EM · AI SURVIVAL GAUNTLET</span>
            </div>

            <h1 className="hero-headline">
              How many AI opponents can you beat?
            </h1>

            <p className="hero-lead">
              Start heads-up against <strong>Jev</strong> with 2,000 chips each. Every time you clear the table,
              the challenge escalates and the field doubles:{" "}
              <span className="hero-seq num">1 → 2 → 4 → 8 → 16 → 32 → 64 → 100</span>.
              Lose your stack once, and the run is over.
            </p>

            <div className="hero-cta-row">
              <Link href="/play" className="btn btn-primary btn-lg">
                <span>Deal Stage 1</span>
                <span aria-hidden="true">→</span>
              </Link>

              {bestRun ? (
                <Link href={`/r/${encodeRun(bestRun)}`} className="btn btn-ghost">
                  Your Record: {bestRun.beaten} AI Beaten
                </Link>
              ) : (
                <a href="#how-it-works" className="btn btn-ghost">
                  How the Gauntlet Works
                </a>
              )}
            </div>
          </motion.div>

          {/* Interactive Doubling Ladder Hero Showcase */}
          <motion.div
            className="hero-ladder-panel"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="panel-top-bar">
              <span className="panel-label">THE ESCALATION LADDER</span>
              <span className="panel-hint">Select a stage to inspect format</span>
            </div>

            {/* 8 Rising Architectural Columns */}
            <div className="hero-bars" role="tablist" aria-label="Escalation stages">
              {STAGE_DOSSIER.map((item, i) => {
                const isSelected = i === selectedIdx;
                const isClearedInBest = bestRun ? i < bestRun.cleared : false;
                const heightPct = 22 + i * 11;
                return (
                  <motion.button
                    key={item.stage}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`hero-bar-col ${isSelected ? "is-selected" : ""} ${
                      isClearedInBest ? "is-cleared" : ""
                    }`}
                    onClick={() => setSelectedIdx(i)}
                    onMouseEnter={() => setSelectedIdx(i)}
                    initial={{ opacity: 0, scaleY: 0.2 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{
                      duration: 0.42,
                      delay: 0.12 + i * 0.045,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                    style={{ transformOrigin: "bottom" }}
                  >
                    <div className="hero-bar-track">
                      <div className="hero-bar-fill" style={{ height: `${heightPct}%` }}>
                        <span className="hero-bar-mult num">
                          {i === 0 ? "1v1" : `${item.stage} AI`}
                        </span>
                      </div>
                    </div>
                    <span className="hero-bar-num num">{item.stage}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Selected Stage Dossier */}
            <div className="stage-dossier">
              <div className="dossier-main">
                <div className="dossier-title-row">
                  <span className="dossier-stage-pill num">STAGE {activeStage.stage}</span>
                  <h2 className="dossier-title">{activeStage.title}</h2>
                </div>
                <p className="dossier-blurb">{activeStage.blurb}</p>

                <div className="dossier-specs num">
                  <div>
                    <span>Format</span>
                    <strong>{activeStage.format}</strong>
                  </div>
                  <div>
                    <span>Total Chips</span>
                    <strong>{((activeStage.stage + 1) * START_STACK).toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Shootout Rounds</span>
                    <strong>
                      {activeRounds} {activeRounds === 1 ? "round" : "rounds"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="dossier-cards" aria-hidden="true">
                <PlayingCard card={parseCard(activeStage.cards[0])} size="md" />
                <PlayingCard card={parseCard(activeStage.cards[1])} size="md" highlighted />
              </div>
            </div>
          </motion.div>
        </section>

        {/* Architectural Breakdown Section */}
        <section id="how-it-works" className="mechanics-section">
          <div className="mechanics-header">
            <span className="section-kicker">BUILT FOR HIGH-STAKES CLARITY</span>
            <h2>One run. Eight rungs. Zero scripted hands.</h2>
          </div>

          <div className="mechanics-grid">
            <article className="mechanic-card">
              <div className="mechanic-num num">01</div>
              <h3>The Doubling Ladder</h3>
              <p>
                Every stage starts fresh with 2,000-chip stacks and 10/20 blinds that escalate every 8 hands.
                Eliminate the table to double the opposition: <strong>1 → 2 → 4 → 8 → 16 → 32 → 64 → 100</strong>.
              </p>
            </article>

            <article className="mechanic-card">
              <div className="mechanic-num num">02</div>
              <h3>Multi-Table Shootouts</h3>
              <p>
                A Hold&apos;em table seats up to nine players. From Stage 16 onward, overflow opponents compete across
                parallel tables in the background. Clear your table, then face the other table winners in the next
                round until you stand alone.
              </p>
            </article>

            <article className="mechanic-card">
              <div className="mechanic-num num">03</div>
              <h3>Live Model Decisions</h3>
              <p>
                Opponents make real decisions from the live table state. Stage 1 opens against{" "}
                <strong>Jev</strong> (sampling from TypeSafe AI&apos;s choice probabilities), joined in deeper stages
                by <strong>Claude Haiku</strong> and tuned Monte-Carlo personalities.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-left">
          <Logo />
          <span className="footer-tagline">Bluff Run — How far can you go against AI?</span>
        </div>
        <div className="footer-right">
          <Link href="/play" className="btn btn-ghost btn-sm">
            Enter the Gauntlet →
          </Link>
        </div>
      </footer>
    </div>
  );
}
