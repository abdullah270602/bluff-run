"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { ARCHETYPES, QUIRKS, TELLS } from "@/game/council";
import type { MemberStat } from "@/game/review";
import { STAGES } from "@/game/run";
import { encodeRun, shareText, type RunStats } from "@/game/share";
import { Bot } from "./Bot";
import { StarButton } from "./StarButton";

/** The run summary that fills the table window when a run ends, and the share page. */
export function Results({ stats, right, council, nearMiss, onPlayAgain, onSameCouncil, shareView = false }: { stats: RunStats; right?: ReactNode; council?: MemberStat[]; nearMiss?: string; onPlayAgain?: () => void; onSameCouncil?: () => void; shareView?: boolean }) {
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const code = encodeRun(stats);
  const url = () => (typeof window === "undefined" ? `/r/${code}` : `${window.location.origin}/r/${code}`);
  const copy = async (kind: "text" | "link") => {
    try { await navigator.clipboard.writeText(kind === "text" ? shareText(stats, url()) : url()); setCopied(kind); setTimeout(() => setCopied(null), 2000); } catch { /* clipboard blocked */ }
  };
  const n = STAGES[Math.min(STAGES.length - 1, stats.stageIdx)];
  const title = stats.won ? "You beat all 100." : stats.cleared === 0 ? "Jev held the first table." : `Out at stage ${stats.stageIdx + 1}.`;
  const bustLine = stats.bust ? `The vote that ended it went ${Math.max(stats.bust.fold, stats.bust.call, stats.bust.raise)} to ${[stats.bust.fold, stats.bust.call, stats.bust.raise].sort((a, b) => b - a)[1]} for ${stats.bust.choice === "fold" ? "a fold" : stats.bust.choice === "check_call" ? "a call" : "a raise"}.` : "";
  const sub = stats.won
    ? "Every stage cleared. Nobody left to sit down against."
    : stats.cleared === 0
      ? `Heads-up is where most runs end. ${bustLine || "Sit back down and read Jev again."}`
      : `${stats.beaten} Jevs outlasted. ${n} were on the council when the stack went. ${bustLine}`;

  return (
    <div className="results">
      <div className="results-left">
        <div>
          <div className="results-kicker num">{stats.daily ? `Daily council #${stats.daily}` : `Council ${stats.seed}`}</div>
          <h2>{title}</h2>
          <p className="results-sub">{sub}</p>
          {nearMiss && <p className="results-near">{nearMiss}</p>}
        </div>
        <div className="results-track" aria-label="Stages">
          {STAGES.map((s, i) => <span key={s} className={`pill num ${i < stats.cleared ? "pill-lime" : i === stats.stageIdx && !stats.won ? "active" : ""}`}>×{s}</span>)}
        </div>
        <div className="results-metrics">
          <div className="metric"><span>Jevs outlasted</span><strong className="num">{stats.beaten}</strong></div>
          <div className="metric"><span>Hands played</span><strong className="num">{stats.hands}</strong></div>
          <div className="metric"><span>Biggest pot won</span><strong className="num">{stats.biggestPot.toLocaleString()}</strong></div>
          <div className="metric"><span>Stage reached</span><strong className="num">{stats.stageIdx + 1} of 8</strong></div>
          <div className="metric wide"><span>Best hand</span><strong>{stats.bestHand || "No showdowns won"}</strong></div>
        </div>
        <div className="results-actions">
          {onSameCouncil && <button type="button" className="pill pill-lime" onClick={onSameCouncil}>Run it back</button>}
          {onPlayAgain ? <button type="button" className={`pill ${onSameCouncil ? "" : "pill-lime"}`} onClick={onPlayAgain}>New council</button> : <Link href={`/play?council=${stats.seed}`} className="pill pill-lime">{shareView ? "Beat this council" : "Play again"}</Link>}
          <button type="button" className="pill" onClick={() => copy("text")}>{copied === "text" ? "Copied" : "Copy summary"}</button>
          <button type="button" className="pill" onClick={() => copy("link")}>{copied === "link" ? "Copied" : "Copy link"}</button>
          <StarButton />
        </div>
      </div>
      <div className="results-right">
        {council && council.length > 0 && (
          <div className="council-reveal">
            <div className="results-right-head"><h3>The council you faced</h3><span className="num">{council.length} {council.length === 1 ? "Jev" : "Jevs"}, stage {stats.stageIdx + 1}</span></div>
            <div className="council-grid">
              {council.map(({ member: m, votes, against, bestRead }) => (
                <div key={m.id} className="member" title={ARCHETYPES[m.archetype].read}>
                  <div className="avatar"><Bot id={`r-${m.id}`} variant={m.shape} mood="idle" /></div>
                  <div className="member-text">
                    <b>{m.name} <span>{ARCHETYPES[m.archetype].label}</span></b>
                    <small>{[m.quirk !== "none" ? QUIRKS[m.quirk].label.toLowerCase() : null, m.tell !== "none" ? `${TELLS[m.tell].label.toLowerCase()} tell` : null].filter(Boolean).join(", ") || "no quirk, no tell"}</small>
                  </div>
                  <div className="member-stat num">
                    {bestRead ? <><span>Best read</span><strong>hand {bestRead.handNo}</strong></> : votes ? <><span>Against the vote</span><strong>{Math.round((against / votes) * 100)}%</strong></> : <><span>Votes</span><strong>0</strong></>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {right}
      </div>
    </div>
  );
}
