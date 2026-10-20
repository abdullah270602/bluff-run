import type { CSSProperties, ReactNode } from "react";
import type { Persona } from "@/brains/types";
import type { Card } from "@/engine/cards";
import { Character, type Mood } from "./Character";
import { Mark } from "./Logo";
import { CardBack, CardFace } from "./PlayingCard";
import { WindowFit } from "./WindowFit";

export type Tone = "call" | "fold" | "raise" | "win" | "think" | "plain";
export interface SeatVM {
  id: string; name: string; model: string; persona: Persona; mood: Mood;
  stack: number; bet: number; folded: boolean; allIn: boolean; out: boolean;
  hole: Card[] | null; status: { text: string; tone: Tone } | null;
  dealer: boolean; turn: boolean; winner: boolean;
}
export interface HeroVM { hole: Card[]; folded: boolean; outcome: string | null; winner: boolean }
export interface WindowProps {
  stage: { n: number; hand: number; cleared: number; round?: string };
  counter: { n: number; name: string };
  blinds: string;
  pot: number;
  potLabel: string;
  potTone?: "win" | "lose";
  potNote?: string;
  board: Card[];
  handNo: number;
  seats: SeatVM[];
  you: SeatVM | null;
  hero: HeroVM | null;
  /** Winning five at showdown: everything else dims. */
  highlight?: Set<Card> | null;
  /** Showdown: whose cards travel to the board. */
  reveal?: { seatId: string; hole: Card[]; heroWon: boolean } | null;
  banner?: { key: string; title: string; sub?: string; big?: boolean } | null;
  turn: { text: string; sub?: string; progress: number; gold?: boolean };
  actions?: ReactNode;
  leftLinks?: ReactNode;
  floating?: ReactNode;
  overlay?: ReactNode;
  fit?: { min?: number; fitHeight?: boolean };
}

type Pos = { side: "l" | "r"; x: number; y: number };
// You always take the first right-hand slot; opponents fill the rest, left side first.
const LARGE: { you: Pos; opps: Pos[] } = { you: { side: "r", x: 118, y: 150 }, opps: [{ side: "l", x: 118, y: 150 }] };
const ONE_COL: { you: Pos; opps: Pos[] } = { you: { side: "r", x: 58, y: 100 }, opps: [{ side: "l", x: 58, y: 100 }, { side: "r", x: 58, y: 296 }, { side: "l", x: 58, y: 296 }] };
const WIDE: { you: Pos; opps: Pos[] } = {
  you: { side: "r", x: 36, y: 78 },
  opps: [
    { side: "l", x: 36, y: 78 }, { side: "r", x: 186, y: 78 }, { side: "l", x: 186, y: 78 }, { side: "r", x: 36, y: 282 },
    { side: "l", x: 36, y: 282 }, { side: "r", x: 186, y: 282 }, { side: "l", x: 186, y: 282 }, { side: "l", x: 336, y: 78 }, { side: "r", x: 336, y: 78 },
  ],
};

const ChipIcon = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <circle cx="9" cy="11" r="6.5" stroke="#d1e0d7" strokeWidth="1.6" strokeDasharray="2.5 1.8" />
    <circle cx="9" cy="11" r="3.5" stroke="#d1e0d7" strokeWidth="1.2" />
    <circle cx="13.5" cy="6.5" r="4" fill="#193d34" stroke="#d1e0d7" strokeWidth="1.4" />
  </svg>
);
const StackIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <ellipse cx="12" cy="6" rx="8" ry="3.5" /><path d="M4 6v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5V6" /><path d="M4 12v6c0 1.93 3.58 3.5 8 3.5s8-1.57 8-3.5v-6" />
  </svg>
);

export function Seat({ s, compact, pos, you = false, highlight, hideCards = false }: { s: SeatVM; compact: boolean; pos: Pos; you?: boolean; highlight?: Set<Card> | null; hideCards?: boolean }) {
  const style = pos.side === "l" ? { left: pos.x, top: pos.y } : { right: pos.x, top: pos.y };
  const showCards = !you && !s.out && !s.folded;
  return (
    <div className={`seat ${pos.side === "l" ? "seat-left" : "seat-right"} ${compact ? "compact" : ""} ${you ? "seat-you" : ""} ${s.out ? "out" : ""} ${s.turn ? "turn" : ""} ${s.winner ? "winner" : ""} ${hideCards ? "hidden-cards" : ""}`} style={style}>
      <div className={`seat-status tone-${s.status?.tone ?? "plain"} ${s.status ? "" : "empty"}`} key={s.status?.text ?? ""}>{s.status?.text ?? " "}</div>
      <div className="avatar-wrap">
        <div className="avatar"><Character id={s.id} model={s.model} mood={s.mood} /></div>
        {showCards && (
          <div className="mini-cards">
            {[0, 1].map((i) => (
              <div className="mini-card" key={i}>{s.hole ? <CardFace card={s.hole[i]} dim={Boolean(highlight && !highlight.has(s.hole[i]))} /> : <CardBack />}</div>
            ))}
          </div>
        )}
      </div>
      <div className="seat-name-row">
        <span className="seat-name">{s.name}</span>
        {s.dealer && !s.out && <span className="badge badge-d">D</span>}
      </div>
      <div className="seat-meta">
        <div className="seat-stack num"><StackIcon />{s.out ? "Out" : s.allIn ? "All in" : s.stack.toLocaleString()}</div>
        <div className={`bet-pill num ${s.bet > 0 ? "" : "empty"}`}><ChipIcon />{s.bet.toLocaleString()}</div>
      </div>
    </div>
  );
}

/** Digits that roll into place when the value changes. */
function Odometer({ value }: { value: number }) {
  const digits = String(Math.max(0, value)).split("");
  return (
    <span className="odo" aria-hidden="true">
      {digits.map((d, i) => (
        <span className="odo-col" key={digits.length - i}>
          <span className="odo-strip" style={{ transform: `translateY(-${Number(d) * 10}%)` }}>
            {Array.from({ length: 10 }, (_, k) => <span key={k}>{k}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function TableWindow(p: WindowProps) {
  const n = p.seats.length;
  const layout = n <= 1 ? LARGE : n <= 3 ? ONE_COL : WIDE;
  const compact = n > 1;
  const ring = Math.max(0, Math.min(100, p.turn.progress));
  const hl = p.highlight ?? null;
  return (
    <WindowFit min={p.fit?.min} fitHeight={p.fit?.fitHeight}>
    <div className={`poker-window ${compact ? "many" : ""}`}>
      <header className="topbar">
        <div className="topbar-left">
          <a href="/" className="brand" aria-label="Bluff Run home"><Mark color="var(--accent)" />Bluff Run</a>
        </div>
        <div className="topbar-center">
          <div className="stage-ind num" aria-label={`Stage ${p.stage.n}, hand ${p.stage.hand}`}>
            <span className="rungs" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < p.stage.cleared ? "done" : i === p.stage.n - 1 ? "now" : ""} />)}
            </span>
            <span className="stage-txt">Stage {p.stage.n}{p.stage.round ? `, ${p.stage.round.toLowerCase()}` : ""}</span>
            <span className="hair" aria-hidden="true" />
            <span className="stage-txt">Hand <Odometer value={p.stage.hand} /></span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="counter num" title="Opponents in this stage"><Mark size={14} color="var(--gold)" /><strong>{p.counter.name}</strong><span>×{p.counter.n}</span></div>
          <div className="counter num" title="Blinds"><strong>{p.blinds}</strong><span>blinds</span></div>
        </div>
      </header>

      <div className="table-stage">
        <div className="table-glow" />
        <div className="arc-rim"><div className="arc-surface" /></div>

        <div className="pot">
          <div className={`pot-label ${p.potTone ?? ""}`}>{p.potLabel}</div>
          <div className="pot-value num" key={p.pot}>{p.pot.toLocaleString()}</div>
          <div className="pot-note">{p.potNote ?? ""}</div>
        </div>

        <div className="seats">
          {p.seats.map((s, i) => <Seat key={s.id} s={s} compact={compact} pos={layout.opps[i] ?? layout.opps[layout.opps.length - 1]} highlight={hl} hideCards={p.reveal?.seatId === s.id} />)}
          {p.you && <Seat s={p.you} compact={compact} pos={layout.you} you />}
        </div>

        <div className="board" aria-label="Community cards">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`slot slot-${i + 1} ${p.board[i] === undefined ? "slot-empty" : ""}`} style={{ "--dx": `${(2 - i) * 83}px` } as CSSProperties}>
              {p.board[i] !== undefined
                ? <div className="card-in" key={`${p.handNo}-${p.board[i]}`} style={{ animationDelay: i < 3 ? `${i * 0.11}s` : "0s" }}><CardFace card={p.board[i]} dim={Boolean(hl && !hl.has(p.board[i]))} className={hl && hl.has(p.board[i]) ? "win" : ""} /></div>
                : <Mark />}
            </div>
          ))}
        </div>

        {p.hero && (
          <div className={`hero-hand ${p.hero.folded ? "dim" : ""} ${p.reveal ? (p.reveal.heroWon ? "away" : "lost") : ""}`} key={`hero-${p.handNo}`}>
            <div className={`hero-outcome ${p.hero.outcome && !p.reveal ? "" : "empty"} ${p.hero.winner ? "tone-win" : ""}`}>{p.hero.outcome ?? " "}</div>
            <div className={`hero-card hero-card-l ${hl && !hl.has(p.hero.hole[0]) ? "dim" : ""}`}><CardFace card={p.hero.hole[0]} /></div>
            <div className={`hero-card hero-card-r ${hl && !hl.has(p.hero.hole[1]) ? "dim" : ""}`}><CardFace card={p.hero.hole[1]} /></div>
          </div>
        )}

        {p.reveal && (() => {
          let cx = 590, cy = 560;
          if (!p.reveal.heroWon) {
            const i = p.seats.findIndex((s) => s.id === p.reveal!.seatId);
            const pos = layout.opps[i] ?? layout.opps[0];
            const seatW = compact ? 132 : 150;
            cx = pos.side === "l" ? pos.x + seatW / 2 : 1180 - pos.x - seatW / 2;
            cy = pos.y + (compact ? 70 : 100);
          }
          return (
            <div className="reveal" style={{ "--fx": `${cx - 590}px`, "--fy": `${cy - 372 - 47}px` } as CSSProperties}>
              {p.reveal.hole.map((card) => <div key={card} className="slot"><CardFace card={card} className={hl && hl.has(card) ? "win" : ""} dim={Boolean(hl && !hl.has(card))} /></div>)}
            </div>
          );
        })()}
        {p.banner && (
          <div className={`banner ${p.banner.big ? "big" : ""}`} key={p.banner.key} aria-live="polite">
            <div className="banner-title">{p.banner.title}</div>
            {p.banner.sub && <div className="banner-sub">{p.banner.sub}</div>}
          </div>
        )}

        <footer className="bottom-bar">
          <div className="bottom-left">{p.leftLinks}</div>
          <div className={`actions ${p.actions ? "" : "hidden"}`}>{p.actions}</div>
          <div className="stadium">
            <svg viewBox="0 0 164 52" fill="none" aria-hidden="true">
              <path d="M 14 45 A 24 24 0 0 1 26 2 L 138 2 A 24 24 0 0 1 138 50 L 26 50 A 24 24 0 0 1 14 45 Z" stroke="rgba(255,255,255,0.1)" strokeWidth="2.2" />
              <path className="stadium-ring" d="M 14 45 A 24 24 0 0 1 26 2 L 138 2 A 24 24 0 0 1 138 50 L 26 50 A 24 24 0 0 1 14 45" pathLength={100} stroke={p.turn.gold ? "var(--gold)" : "rgba(255,255,255,0.35)"} strokeWidth="2.4" strokeLinecap="round" strokeDasharray={100} strokeDashoffset={100 - ring} />
            </svg>
            <div className="stadium-text">{p.turn.text}{p.turn.sub && <span className="num">{p.turn.sub}</span>}</div>
          </div>
        </footer>

        {p.floating}
        {p.overlay}
      </div>
    </div>
    </WindowFit>
  );
}
