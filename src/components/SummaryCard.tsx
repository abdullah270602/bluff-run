"use client";

import { useState } from "react";
import Link from "next/link";
import { STAGES } from "@/game/run";
import { encodeRun, type RunStats } from "@/game/share";
import { Mark } from "./Logo";

export interface SummaryCardProps {
  stats: RunStats;
  isShareView?: boolean;
  onPlayAgain?: () => void;
}

export function SummaryCard({ stats, isShareView = false, onPlayAgain }: SummaryCardProps) {
  const [copiedMode, setCopiedMode] = useState<"text" | "link" | null>(null);
  const code = encodeRun(stats);
  const stageNumber = STAGES[Math.min(STAGES.length - 1, Math.max(0, stats.stageIdx))];

  const getShareUrl = () => {
    if (typeof window === "undefined") return `/r/${code}`;
    return `${window.location.origin}/r/${code}`;
  };

  const buildShareText = () => {
    const blocks = STAGES.map((_, i) =>
      i < stats.cleared ? "■" : i === stats.stageIdx && !stats.won ? "▣" : "□"
    ).join(" ");
    const headline = stats.won
      ? `Bluff Run: cleared all 8 stages, ${stats.beaten} AI opponents beaten`
      : `Bluff Run: reached stage ${stageNumber}, ${stats.beaten} AI opponents beaten`;
    return [
      headline,
      `${blocks}  1 to 100`,
      `${stats.hands} hands, biggest pot ${stats.biggestPot.toLocaleString()}${stats.bestHand ? `, best hand ${stats.bestHand.toLowerCase()}` : ""}`,
      `Beat it: ${getShareUrl()}`,
    ].join("\n");
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText());
      setCopiedMode("text");
      setTimeout(() => setCopiedMode(null), 2400);
    } catch {
      // Fallback
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      setCopiedMode("link");
      setTimeout(() => setCopiedMode(null), 2400);
    } catch {
      // Fallback
    }
  };

  const headline = stats.won
    ? "Cleared the 100."
    : stats.cleared === 0
      ? "Stopped at Stage 1."
      : `Fell at Stage ${stageNumber}.`;

  const subline = stats.won
    ? "Every stage cleared. One hundred opponents, none left standing."
    : stats.cleared === 0
      ? "Jev held the first table. The ladder is still there."
      : `Cleared ${stats.cleared} of ${STAGES.length} stages before the stack went at stage ${stageNumber}.`;

  return (
    <section className="summary-card" aria-label="Run Summary">
      <div className="summary-header">
        <div className="summary-badge-row">
          <span className={`summary-pill ${stats.won ? "summary-pill-won" : ""}`}>
            <Mark size={16} color="currentColor" />
            <span>{stats.won ? "All 100 beaten" : isShareView ? "Shared run" : "Run over"}</span>
          </span>
          {stats.date && <span className="summary-date num">{stats.date}</span>}
        </div>
        <h1 className="summary-title">{headline}</h1>
        <p className="summary-sub">{subline}</p>
      </div>

      {/* Spine: Rising architectural ladder bars */}
      <div className="summary-spine" aria-label="Stage progression">
        {STAGES.map((n, i) => {
          const isCleared = i < stats.cleared;
          const isFinal = i === stats.stageIdx && !stats.won;
          const heightPct = 24 + i * 10.8;
          return (
            <div
              key={n}
              className={`spine-col ${isCleared ? "is-cleared" : isFinal ? "is-final" : ""}`}
            >
              <div className="spine-bar-wrap">
                <div className="spine-bar" style={{ height: `${heightPct}%` }}>
                  <span className="spine-status" aria-hidden="true">
                    {isCleared ? "✓" : isFinal ? "×" : ""}
                  </span>
                </div>
              </div>
              <span className="spine-num num">{n}</span>
            </div>
          );
        })}
      </div>

      {/* Telemetry metrics */}
      <div className="summary-metrics">
        <div className="metric-box">
          <span className="metric-label">Stage reached</span>
          <strong className="metric-val num">
            Stage {stageNumber}
            <small className="metric-note">{stats.cleared}/8 cleared</small>
          </strong>
        </div>
        <div className="metric-box">
          <span className="metric-label">Opponents beaten</span>
          <strong className="metric-val num">{stats.beaten}</strong>
        </div>
        <div className="metric-box">
          <span className="metric-label">Hands played</span>
          <strong className="metric-val num">{stats.hands}</strong>
        </div>
        <div className="metric-box">
          <span className="metric-label">Biggest pot won</span>
          <strong className="metric-val num">{stats.biggestPot.toLocaleString()}</strong>
        </div>
        <div className="metric-box metric-box-wide">
          <span className="metric-label">Best hand</span>
          <strong className="metric-val">{stats.bestHand || "No showdowns"}</strong>
        </div>
      </div>

      {/* Share & Replay Actions */}
      <div className="summary-actions">
        {onPlayAgain ? (
          <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
            Play again
          </button>
        ) : (
          <Link href="/play" className="btn btn-primary">
            {isShareView ? "Beat this run" : "New run"}
          </Link>
        )}

        <button type="button" className="btn btn-ghost" onClick={copyText}>
          {copiedMode === "text" ? "Copied" : "Copy summary"}
        </button>

        <button type="button" className="btn btn-ghost" onClick={copyLink}>
          {copiedMode === "link" ? "Copied" : "Copy link"}
        </button>

        {!isShareView && (
          <Link href={`/r/${code}`} className="btn btn-ghost">
            Open share page
          </Link>
        )}
      </div>
    </section>
  );
}
