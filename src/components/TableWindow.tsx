import type { ReactNode } from "react";
import type { Persona } from "@/brains/types";
import type { Card } from "@/engine/cards";
import { Avatar } from "./Avatar";
import { Mark } from "./Logo";
import { CardBack, CardFace } from "./PlayingCard";
import { WindowFit } from "./WindowFit";

export type Tone = "call" | "fold" | "raise" | "win" | "think" | "plain";
export interface SeatVM {
  id: string; name: string; model: string; persona: Persona;
  stack: number; bet: number; folded: boolean; allIn: boolean; out: boolean;
  hole: Card[] | null; status: { text: string; tone: Tone } | null;
  dealer: boolean; turn: boolean; winner: boolean;
}
export interface HeroVM { hole: Card[]; stack: number; bet: number; dealer: boolean; folded: boolean; outcome: string | null; winner: boolean }
export interface WindowProps {
  centerLabel: string;
  counter: { n: number; unit: string };
  blinds: string;
  pot: number;
  potLabel: string;
  potTone?: "win" | "lose";
  potNote?: string;
  board: Card[];
  handNo: number;
  seats: SeatVM[];
  hero: HeroVM | null;
  turn: { text: string; sub?: string; progress: number; lime?: boolean };
  actions?: ReactNode;
  leftLinks?: ReactNode;
  floating?: ReactNode;
  overlay?: ReactNode;
  topRight?: ReactNode;
  fit?: { min?: number; fitHeight?: boolean };
}

const LARGE = [{ side: "l", x: 118, y: 150 }, { side: "r", x: 118, y: 150 }];
const ONE_COL = [{ side: "l", x: 58, y: 96 }, { side: "r", x: 58, y: 96 }, { side: "l", x: 58, y: 300 }, { side: "r", x: 58, y: 300 }];
const TWO_COL = [
  { side: "l", x: 36, y: 96 }, { side: "r", x: 36, y: 96 }, { side: "l", x: 186, y: 96 }, { side: "r", x: 186, y: 96 },
  { side: "l", x: 36, y: 300 }, { side: "r", x: 36, y: 300 }, { side: "l", x: 186, y: 300 }, { side: "r", x: 186, y: 300 },
];

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

export function Seat({ s, compact, pos }: { s: SeatVM; compact: boolean; pos: { side: string; x: number; y: number } }) {
  const style = pos.side === "l" ? { left: pos.x, top: pos.y } : { right: pos.x, top: pos.y };
  const showCards = !s.out && !s.folded;
  return (
    <div className={`seat ${pos.side === "l" ? "seat-left" : "seat-right"} ${compact ? "compact" : ""} ${s.out ? "out" : ""} ${s.turn ? "turn" : ""} ${s.winner ? "winner" : ""}`} style={style}>
      <div className={`seat-status tone-${s.status?.tone ?? "plain"} ${s.status ? "" : "empty"}`}>{s.status?.text ?? " "}</div>
      <div className="avatar-wrap">
        <Avatar model={s.model} name={s.name} persona={s.persona} />
        {showCards && (
          <div className="mini-cards">
            {[0, 1].map((i) => (
              <div className="mini-card" key={i}>{s.hole ? <CardFace card={s.hole[i]} /> : <CardBack />}</div>
            ))}
          </div>
        )}
      </div>
      <div className="seat-name-row">
        <span className="seat-name">{s.name}</span>
        {s.dealer && !s.out && <span className="badge badge-d">D</span>}
      </div>
      <div className="seat-stack num"><StackIcon />{s.out ? "Out" : s.allIn ? "All in" : s.stack.toLocaleString()}</div>
      <div className={`bet-pill num ${s.bet > 0 ? "" : "empty"}`}><ChipIcon />{s.bet.toLocaleString()}</div>
    </div>
  );
}

export function TableWindow(p: WindowProps) {
  const n = p.seats.length;
  const positions = n <= 2 ? LARGE : n <= 4 ? ONE_COL : TWO_COL;
  const compact = n > 2;
  const ring = Math.max(0, Math.min(100, p.turn.progress));
  return (
    <WindowFit min={p.fit?.min} fitHeight={p.fit?.fitHeight}>
    <div className="poker-window">
      <header className="topbar">
        <div className="topbar-left">
          <a href="/" className="brand" aria-label="Bluff Run home"><Mark color="var(--lime)" />Bluff Run</a>
        </div>
        <div className="topbar-center num">{p.centerLabel}</div>
        <div className="topbar-right">
          <div className="counter num" title="Opponents in this stage"><Mark size={14} color="var(--lime)" /><strong>{p.counter.n}</strong><span>{p.counter.unit}</span></div>
          <div className="counter num" title="Blinds"><strong>{p.blinds}</strong><span>blinds</span></div>
          {p.topRight}
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

        <div className="board" aria-label="Community cards">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`slot slot-${i + 1} ${p.board[i] === undefined ? "slot-empty" : ""}`}>
              {p.board[i] !== undefined ? <div className="card-in" key={`${p.handNo}-${p.board[i]}`}><CardFace card={p.board[i]} /></div> : <Mark />}
            </div>
          ))}
        </div>

        {p.seats.map((s, i) => <Seat key={s.id} s={s} compact={compact} pos={positions[i]} />)}

        {p.hero && (
          <>
            <div className="bank-you">
              <div className="seat-name-row" style={{ justifyContent: "flex-start" }}>
                <span className="seat-name">You</span>
                {p.hero.dealer && <span className="badge badge-d">D</span>}
              </div>
              <div className={`bet-pill num ${p.hero.bet > 0 ? "" : "empty"}`}><ChipIcon />{p.hero.bet.toLocaleString()}</div>
            </div>
            <div className={`hero-hand ${p.hero.folded ? "dim" : ""}`} key={`hero-${p.handNo}`}>
              <div className={`hero-outcome ${p.hero.outcome ? "" : "empty"} ${p.hero.winner ? "tone-win" : ""}`}>{p.hero.outcome ?? " "}</div>
              <div className="hero-card hero-card-l"><CardFace card={p.hero.hole[0]} /></div>
              <div className="hero-card hero-card-r"><CardFace card={p.hero.hole[1]} /></div>
            </div>
            <div className="bank">
              <div className="bank-col">
                <div className="bank-label">Your bank</div>
                <div className="bank-amount num" key={p.hero.stack}>{p.hero.stack.toLocaleString()}</div>
              </div>
            </div>
          </>
        )}

        <footer className="bottom-bar">
          <div className="bottom-left">{p.leftLinks}</div>
          <div className={`actions ${p.actions ? "" : "hidden"}`}>{p.actions}</div>
          <div className="stadium">
            <svg viewBox="0 0 164 52" fill="none" aria-hidden="true">
              <path d="M 14 45 A 24 24 0 0 1 26 2 L 138 2 A 24 24 0 0 1 138 50 L 26 50 A 24 24 0 0 1 14 45 Z" stroke="rgba(255,255,255,0.1)" strokeWidth="2.2" />
              <path className="stadium-ring" d="M 14 45 A 24 24 0 0 1 26 2 L 138 2 A 24 24 0 0 1 138 50 L 26 50 A 24 24 0 0 1 14 45" pathLength={100} stroke={p.turn.lime ? "var(--lime)" : "rgba(255,255,255,0.35)"} strokeWidth="2.4" strokeLinecap="round" strokeDasharray={100} strokeDashoffset={100 - ring} />
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
