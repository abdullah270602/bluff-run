"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Logo } from "@/components/Logo";
import { PlayingCard } from "@/components/PlayingCard";
import { BEST_RUN_STORAGE_KEY } from "@/components/PokerArena";
import { parseCard } from "@/engine/cards";
import { MODELS } from "@/brains/types";
import { type Opponent, splitRound, STAGES } from "@/game/run";
import { encodeRun, type RunStats } from "@/game/share";

/** Real round structure for a stage, straight from the same split the game uses. */
function bracket(n: number) {
  const rows: { seats: number; others: number; tables: number }[] = [];
  let field = n;
  while (field > 0) {
    const { mine, others } = splitRound(Array.from({ length: field }, (_, i) => ({ id: String(i) }) as Opponent));
    rows.push({ seats: mine.length, others: field - mine.length, tables: others.length });
    field = others.length;
  }
  return rows;
}

function stageSentence(n: number) {
  const rows = bracket(n);
  if (n === 1) return "One table. You and Jev, heads-up, 2,000 chips each.";
  if (rows.length === 1) return `One table. You and ${n} opponents. Take every chip to clear the stage.`;
  const first = rows[0];
  return `${rows.length} rounds. Your table seats you and ${first.seats}. The other ${first.others} play ${first.tables} ${first.tables === 1 ? "table" : "tables"} in the background, and their winners come back for you.`;
}

const SAMPLE_CARDS: [string, string][] = [["As", "Ks"], ["Qh", "Qd"], ["Jh", "Th"], ["Ac", "Ad"], ["Kd", "Qd"], ["9s", "9c"], ["Ah", "5h"], ["As", "Ah"]];

export default function LandingPage() {
  const [selected, setSelected] = useState(0);
  const [bestRun, setBestRun] = useState<RunStats | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(BEST_RUN_STORAGE_KEY);
      if (raw) setBestRun(JSON.parse(raw) as RunStats);
    } catch { /* storage unavailable */ }
    fetch("/api/decide").then((r) => (r.ok ? r.json() : null)).then((d) => d && setConfigured(Boolean(d.configured))).catch(() => {});
  }, []);

  const n = STAGES[selected];
  const rows100 = bracket(100);

  return (
    <div className="landing-shell">
      <header className="site-nav">
        <Logo />
        <nav className="nav-right" aria-label="Primary">
          {bestRun && (
            <Link href={`/r/${encodeRun(bestRun)}`} className="best-run-pill num">
              Best run: stage {STAGES[bestRun.stageIdx]}, {bestRun.beaten} beaten
            </Link>
          )}
          <a href="#how" className="nav-link">How it works</a>
          <Link href="/play" className="btn btn-primary btn-sm">Sit down</Link>
        </nav>
      </header>

      <main className="landing-main">
        <section className="hero-grid">
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}>
            <h1 className="hero-headline">How many AI opponents can you beat?</h1>
            <p className="hero-lead">
              Heads-up against Jev to start. Win the table and the field doubles. One stack, no second chances.
            </p>
            <div className="hero-cta-row">
              <Link href="/play" className="btn btn-primary btn-lg">Sit down</Link>
              <span className="hero-seq num">1, 2, 4, 8, 16, 32, 64, 100</span>
            </div>
          </motion.div>

          <motion.div className="hero-ladder-panel" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}>
            <div className="panel-top-bar">
              <span className="panel-label">The ladder</span>
              <span className="panel-hint">Hover a stage</span>
            </div>

            <div className="hero-bars" role="tablist" aria-label="Stages">
              {STAGES.map((stage, i) => {
                const isSelected = i === selected;
                const clearedInBest = bestRun ? i < bestRun.cleared : false;
                return (
                  <motion.button
                    key={stage}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    className={`hero-bar-col ${isSelected ? "is-selected" : ""} ${clearedInBest ? "is-cleared" : ""}`}
                    onClick={() => setSelected(i)}
                    onMouseEnter={() => setSelected(i)}
                    onFocus={() => setSelected(i)}
                    initial={{ opacity: 0, scaleY: 0.2 }}
                    animate={{ opacity: 1, scaleY: 1 }}
                    transition={{ duration: 0.42, delay: 0.12 + i * 0.045, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{ transformOrigin: "bottom" }}
                  >
                    <div className="hero-bar-track">
                      <div className="hero-bar-fill" style={{ height: `${22 + i * 11}%` }} />
                    </div>
                    <span className="hero-bar-num num">{stage}</span>
                  </motion.button>
                );
              })}
            </div>

            <div className="stage-detail">
              <div className="stage-detail-main">
                <h2 className="stage-detail-title num">Stage {selected + 1}: {n} {n === 1 ? "opponent" : "opponents"}</h2>
                <p className="stage-detail-text">{stageSentence(n)}</p>
              </div>
              <div className="stage-detail-cards" aria-hidden="true">
                <PlayingCard card={parseCard(SAMPLE_CARDS[selected][0])} size="md" />
                <PlayingCard card={parseCard(SAMPLE_CARDS[selected][1])} size="md" highlighted />
              </div>
            </div>
          </motion.div>
        </section>

        <section id="how" className="how-section">
          <h2 className="section-title">One run. Eight stages. No scripted hands.</h2>
          <ol className="steps">
            <li>
              <h3>Sit down</h3>
              <p>Every table starts fresh: 2,000 chips each, blinds at 10/20, rising every eight hands.</p>
            </li>
            <li>
              <h3>Take every chip</h3>
              <p>Clear the table and the stage is yours. Lose your stack once and the run ends.</p>
            </li>
            <li>
              <h3>Watch it double</h3>
              <p>Each cleared stage doubles the field, up to 100 opponents.</p>
            </li>
          </ol>
        </section>

        <section className="opponents-section">
          <div className="opponents-intro">
            <h2 className="section-title">The opponents decide for themselves.</h2>
            <p>
              Each seat is driven by a model that sees the same table you do: cards, pot, price to call, who did what. No scripted lines.
              {configured === false && " This deployment has no OpenRouter key yet, so the table cannot open."}
            </p>
          </div>
          <ul className="roster">
            {MODELS.map((m) => (
              <li key={m.id}>
                <span className={`roster-glyph glyph-${m.id}`} aria-hidden="true">{m.short[0]}</span>
                <div>
                  <h3>{m.label}</h3>
                  <p>{m.blurb}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="bracket-section">
          <h2 className="section-title">Past eight, it becomes a shootout.</h2>
          <p className="bracket-lead">A poker table seats nine. At stage 100 the field splits into tables. You play yours live, Jev plays the rest on the server at the same time, and the winners come back for you. Three rounds, and you have to win every table.</p>
          <ol className="bracket" aria-label="Stage 100 rounds">
            {rows100.map((r, i) => (
              <li key={i} className="bracket-row">
                <span className="bracket-round num">Round {i + 1}</span>
                <span className="bracket-tables" aria-hidden="true">
                  <span className="bracket-table is-you" />
                  {Array.from({ length: r.tables }, (_, k) => <span key={k} className="bracket-table" />)}
                </span>
                <span className="bracket-note num">
                  {r.tables === 0 ? `You and ${r.seats} at the final table` : `Your table of ${r.seats + 1}, plus ${r.others} opponents on ${r.tables} ${r.tables === 1 ? "table" : "tables"}`}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="site-footer">
        <Logo />
        <Link href="/play" className="btn btn-ghost btn-sm">Sit down</Link>
      </footer>
    </div>
  );
}
