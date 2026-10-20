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
      ? `Bluff Run — Cleared all 8 stages (${stats.beaten} AI beaten)`
      : `Bluff Run — Reached Stage ${stageNumber} (${stats.beaten} AI beaten)`;
    return [
      headline,
      `${blocks}  [1 → 100]`,
      `Hands: ${stats.hands} · Biggest pot: ${stats.biggestPot.toLocaleString()} · Best hand: ${stats.bestHand || "—"}`,
      `Beat my run: ${getShareUrl()}`,
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
    ? "You outlasted every AI opponent across all eight stages of the gauntlet."
    : stats.cleared === 0
      ? "Jev defended the opening heads-up table. The ladder awaits a rematch."
      : `Cleared ${stats.cleared} of ${STAGES.length} stages (${STAGES.slice(0, stats.cleared).join(" → ")}) before busting at Stage ${stageNumber}.`;

  return (
    <section className="summary-card" aria-label="Run Summary">
      <div className="summary-header">
        <div className="summary-badge-row">
          <span className={`summary-pill ${stats.won ? "summary-pill-won" : ""}`}>
            <Mark size={16} color="currentColor" />
            <span>{stats.won ? "GAUNTLET CLEARED" : isShareView ? "CHALLENGE RECORD" : "RUN COMPLETE"}</span>
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
          <span className="metric-label">AI opponents beaten</span>
          <strong className="metric-val num">{stats.beaten}</strong>
        </div>
        <div className="metric-box">
          <span className="metric-label">Hands survived</span>
          <strong className="metric-val num">{stats.hands}</strong>
        </div>
        <div className="metric-box">
          <span className="metric-label">Biggest pot won</span>
          <strong className="metric-val num">{stats.biggestPot.toLocaleString()}</strong>
        </div>
        <div className="metric-box metric-box-wide">
          <span className="metric-label">Signature hand</span>
          <strong className="metric-val">{stats.bestHand || "Uncontested pots"}</strong>
        </div>
      </div>

      {/* Share & Replay Actions */}
      <div className="summary-actions">
        {onPlayAgain ? (
          <button type="button" className="btn btn-primary" onClick={onPlayAgain}>
            Run It Back →
          </button>
        ) : (
          <Link href="/play" className="btn btn-primary">
            {isShareView ? "Beat This Run →" : "Start New Run →"}
          </Link>
        )}

        <button type="button" className="btn btn-ghost" onClick={copyText}>
          {copiedMode === "text" ? "Copied Summary ✓" : "Share Summary"}
        </button>

        <button type="button" className="btn btn-ghost" onClick={copyLink}>
          {copiedMode === "link" ? "Link Copied ✓" : "Copy Share Link"}
        </button>

        {!isShareView && (
          <Link href={`/r/${code}`} className="btn btn-ghost">
            Permalink ↗
          </Link>
        )}
      </div>
    </section>
  );
}
