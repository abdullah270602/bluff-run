"use client";

import { Card, rankOf, suitOf } from "@/engine/cards";

const RANK_DISPLAY = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUIT_NAME = ["spades", "hearts", "diamonds", "clubs"] as const;

function SuitIcon({ suit, className = "" }: { suit: number; className?: string }) {
  switch (suit) {
    case 0: // Spades
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2C7 8 3 11.5 3 15a4.5 4.5 0 0 0 7.6 3.2L9.2 22h5.6l-1.4-3.8A4.5 4.5 0 0 0 21 15c0-3.5-4-7-9-13Z" />
        </svg>
      );
    case 1: // Hearts
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z" />
        </svg>
      );
    case 2: // Diamonds
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 2L20 12L12 22L4 12L12 2Z" />
        </svg>
      );
    default: // Clubs
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
          <path d="M12 3a4.2 4.2 0 0 0-3.7 6.2A4.3 4.3 0 1 0 9.8 17l-1.3 4h7l-1.3-4a4.3 4.3 0 1 0 1.5-7.8A4.2 4.2 0 0 0 12 3Z" />
        </svg>
      );
  }
}

export interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  highlighted?: boolean;
  dimmed?: boolean;
  className?: string;
}

export function PlayingCard({
  card,
  faceDown = false,
  size = "md",
  highlighted = false,
  dimmed = false,
  className = "",
}: PlayingCardProps) {
  if (faceDown || card === undefined) {
    return (
      <div
        className={`pcard pcard-back pcard-${size} ${dimmed ? "pcard-dim" : ""} ${className}`}
        aria-label="Face-down card"
      >
        <div className="pcard-back-inner">
          <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
            <rect x="0" y="28" width="4" height="4" rx="1.1" />
            <rect x="5" y="22.5" width="6" height="6" rx="1.6" />
            <rect x="12" y="15" width="9" height="9" rx="2.3" />
            <rect x="19" y="4" width="13" height="13" rx="3.2" />
          </svg>
        </div>
      </div>
    );
  }

  const r = rankOf(card);
  const s = suitOf(card);
  const rankStr = RANK_DISPLAY[r];
  const isRed = s === 1 || s === 2;

  return (
    <div
      className={`pcard pcard-face pcard-${size} ${isRed ? "pcard-red" : "pcard-black"} ${
        highlighted ? "pcard-highlight" : ""
      } ${dimmed ? "pcard-dim" : ""} ${className}`}
      aria-label={`${rankStr} of ${SUIT_NAME[s]}`}
    >
      <div className="pcard-corner pcard-corner-top">
        <span className={`pcard-rank ${rankStr === "10" ? "pcard-rank-ten" : ""}`}>{rankStr}</span>
        <SuitIcon suit={s} className="pcard-pip-sm" />
      </div>
      <div className="pcard-center">
        <SuitIcon suit={s} className="pcard-pip-lg" />
      </div>
      <div className="pcard-corner pcard-corner-bottom" aria-hidden="true">
        <span className={`pcard-rank ${rankStr === "10" ? "pcard-rank-ten" : ""}`}>{rankStr}</span>
        <SuitIcon suit={s} className="pcard-pip-sm" />
      </div>
    </div>
  );
}
