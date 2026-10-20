"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import { STAGES } from "@/game/run";
import { encodeRun, type RunStats } from "@/game/share";

export function shareText(stats: RunStats, url: string) {
  const stage = STAGES[Math.min(STAGES.length - 1, stats.stageIdx)];
  const head = stats.won ? `Bluff Run: cleared all 8 stages, ${stats.beaten} AI opponents beaten` : `Bluff Run: reached stage ${stats.stageIdx + 1} (${stage} opponents), ${stats.beaten} AI opponents beaten`;
  const track = STAGES.map((_, i) => (i < stats.cleared ? "■" : i === stats.stageIdx && !stats.won ? "▣" : "□")).join(" ");
  return `${head}\n${track}\n${stats.hands} hands, biggest pot ${stats.biggestPot.toLocaleString()}${stats.bestHand ? `, best hand ${stats.bestHand.toLowerCase()}` : ""}\nBeat it: ${url}`;
}

/** The run summary that fills the table window when a run ends, and the share page. */
export function Results({ stats, right, onPlayAgain, shareView = false }: { stats: RunStats; right?: ReactNode; onPlayAgain?: () => void; shareView?: boolean }) {
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const code = encodeRun(stats);
  const stage = STAGES[Math.min(STAGES.length - 1, stats.stageIdx)];
  const url = () => (typeof window === "undefined" ? `/r/${code}` : `${window.location.origin}/r/${code}`);
  const copy = async (kind: "text" | "link") => {
    try { await navigator.clipboard.writeText(kind === "text" ? shareText(stats, url()) : url()); setCopied(kind); setTimeout(() => setCopied(null), 2000); } catch { /* clipboard blocked */ }
  };
  const title = stats.won ? "You beat all 100." : stats.cleared === 0 ? "Jev held the first table." : `Out at stage ${stats.stageIdx + 1}.`;
  const sub = stats.won
    ? "Every stage cleared. Nobody left to sit down against."
    : stats.cleared === 0
      ? "Heads-up is where most runs end. Sit back down and read Jev again."
      : `${stats.cleared} of 8 stages cleared. The stack went with ${stage} opponents in the field.`;

  return (
    <div className="results">
      <div className="results-left">
        <div>
          <h2>{title}</h2>
          <p className="results-sub">{sub}</p>
        </div>
        <div className="results-track" aria-label="Stages">
          {STAGES.map((n, i) => <span key={n} className={`pill num ${i < stats.cleared ? "pill-lime" : i === stats.stageIdx && !stats.won ? "active" : ""}`}>{n}</span>)}
        </div>
        <div className="results-metrics">
          <div className="metric"><span>Opponents beaten</span><strong className="num">{stats.beaten}</strong></div>
          <div className="metric"><span>Hands played</span><strong className="num">{stats.hands}</strong></div>
          <div className="metric"><span>Biggest pot won</span><strong className="num">{stats.biggestPot.toLocaleString()}</strong></div>
          <div className="metric"><span>Stage reached</span><strong className="num">{stats.stageIdx + 1} of 8</strong></div>
          <div className="metric wide"><span>Best hand</span><strong>{stats.bestHand || "No showdowns won"}</strong></div>
        </div>
        <div className="results-actions">
          {onPlayAgain ? <button type="button" className="pill pill-lime" onClick={onPlayAgain}>Play again</button> : <Link href="/play" className="pill pill-lime">{shareView ? "Beat this run" : "Play again"}</Link>}
          <button type="button" className="pill" onClick={() => copy("text")}>{copied === "text" ? "Copied" : "Copy summary"}</button>
          <button type="button" className="pill" onClick={() => copy("link")}>{copied === "link" ? "Copied" : "Copy link"}</button>
        </div>
      </div>
      <div className="results-right">{right}</div>
    </div>
  );
}
