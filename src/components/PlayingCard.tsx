import { type Card, rankOf, suitOf } from "@/engine/cards";

const RANK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUIT_NAME = ["spades", "hearts", "diamonds", "clubs"];
const SUIT_PATH = [
  "M12 2C7 8 3 11.5 3 15a4.5 4.5 0 0 0 7.6 3.2L9.2 22h5.6l-1.4-3.8A4.5 4.5 0 0 0 21 15c0-3.5-4-7-9-13Z",
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35Z",
  "M12 2L20 12L12 22L4 12L12 2Z",
  "M12 3a4.2 4.2 0 0 0-3.7 6.2A4.3 4.3 0 1 0 9.8 17l-1.3 4h7l-1.3-4a4.3 4.3 0 1 0 1.5-7.8A4.2 4.2 0 0 0 12 3Z",
];

export function Suit({ suit, className }: { suit: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d={SUIT_PATH[suit]} />
    </svg>
  );
}

/** A face-up card. Size comes from the parent: .slot, .mini-card or .hero-card. */
export function CardFace({ card, dim = false, className = "" }: { card: Card; dim?: boolean; className?: string }) {
  const r = rankOf(card), s = suitOf(card);
  return (
    <div className={`card ${s === 1 || s === 2 ? "card-red" : "card-black"} ${dim ? "dim" : ""} ${className}`} aria-label={`${RANK[r]} of ${SUIT_NAME[s]}`}>
      <div className="card-corner">
        <span className="card-rank">{RANK[r]}</span>
        <Suit suit={s} className="card-suit-mini" />
      </div>
      <Suit suit={s} className="card-suit-big" />
    </div>
  );
}

export function CardBack() {
  return (
    <div className="card-back" aria-label="Face-down card">
      <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <rect x="0" y="28" width="4" height="4" rx="1.1" />
        <rect x="5" y="22.5" width="6" height="6" rx="1.6" />
        <rect x="12" y="15" width="9" height="9" rx="2.3" />
        <rect x="19" y="4" width="13" height="13" rx="3.2" />
      </svg>
    </div>
  );
}
