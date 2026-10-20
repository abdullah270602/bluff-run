import type { CSSProperties, ReactNode } from "react";
import type { Card } from "@/engine/cards";
import { Bot, type Mood } from "./Bot";
import { Mark } from "./Logo";
import { CardBack, CardFace } from "./PlayingCard";
import { WindowFit } from "./WindowFit";

export type Tone = "call" | "fold" | "raise" | "win" | "think" | "plain";
export interface SeatVM {
  id: string; name: string; mood: Mood; variant: number; light?: boolean; sub?: string;
  stack: number; bet: number; folded: boolean; allIn: boolean; out: boolean;
  hole: Card[] | null; status: { text: string; tone: Tone } | null;
  dealer: boolean; turn: boolean; winner: boolean;
}
export interface HeroVM { hole: Card[]; folded: boolean; outcome: string | null; winner: boolean }
export interface Flight { id: number; from: string; to: string; amount: number }
export interface Deliberation { counts: { fold: number; call: number; raise: number }; total: number; done: boolean; carried?: string; allowed: { fold: boolean; raise: boolean } }
export interface WindowProps {
  stage: { n: number; hand: number; cleared: number };
  counter: { n: number; name: string };
  blinds: string;
  pot: number;
  potLabel: string;
  potTone?: "win" | "lose";
  potNote?: string;
  board: Card[];
  handNo: number;
  seat: SeatVM | null;
  you: SeatVM | null;
  hero: HeroVM | null;
  deliberation?: Deliberation | null;
  highlight?: Set<Card> | null;
  reveal?: { seatId: string; hole: Card[]; heroWon: boolean } | null;
  banner?: { key: string; title: string; sub?: string; big?: boolean } | null;
  flights?: Flight[];
  turn: { text: string; sub?: string; progress: number; gold?: boolean };
  actions?: ReactNode;
  leftLinks?: ReactNode;
  floating?: ReactNode;
  overlay?: ReactNode;
  fit?: { min?: number; fitHeight?: boolean };
}

const SEAT_X = 118, SEAT_Y = 150, SEAT_W = 150;

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

export function Seat({ s, side, you = false, highlight, hideCards = false }: { s: SeatVM; side: "l" | "r"; you?: boolean; highlight?: Set<Card> | null; hideCards?: boolean }) {
  const style = side === "l" ? { left: SEAT_X, top: SEAT_Y } : { right: SEAT_X, top: SEAT_Y };
  const showCards = !you && !s.out && !s.folded;
  return (
    <div className={`seat ${side === "l" ? "seat-left" : "seat-right"} ${you ? "seat-you" : ""} ${s.out ? "out" : ""} ${s.turn ? "turn" : ""} ${s.winner ? "winner" : ""} ${hideCards ? "hidden-cards" : ""}`} style={style}>
      <div className={`seat-status tone-${s.status?.tone ?? "plain"} ${s.status ? "" : "empty"}`} key={s.status?.text ?? ""}>{s.status?.text ?? " "}</div>
      <div className="avatar-wrap">
        <div className="avatar"><Bot id={s.id} variant={s.variant} light={s.light ?? you} mood={s.mood} /></div>
        {s.turn && (
          <svg className={`turn-ring ${s.mood === "think" ? "sweep" : ""}`} viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="57" fill="none" stroke="var(--gold)" strokeWidth="3" strokeLinecap="round" pathLength={100} />
          </svg>
        )}
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
      {s.sub && <div className="seat-sub">{s.sub}</div>}
      <div className="seat-meta">
        <div className="seat-stack num"><StackIcon />{s.out ? "Out" : s.allIn ? "All in" : s.stack.toLocaleString()}</div>
        <div className={`bet-pill num ${s.bet > 0 ? "" : "empty"}`}><ChipIcon />{s.bet.toLocaleString()}</div>
      </div>
    </div>
  );
}

export function TableWindow(p: WindowProps) {
  const ring = Math.max(0, Math.min(100, p.turn.progress));
  const hl = p.highlight ?? null;
  const d = p.deliberation;
  return (
    <WindowFit min={p.fit?.min} fitHeight={p.fit?.fitHeight}>
    <div className="poker-window">
      <header className="topbar">
        <div className="topbar-left">
          <a href="/" className="brand" aria-label="Bluff Run home"><Mark color="var(--accent)" />Bluff Run</a>
        </div>
        <div className="topbar-center">
          <div className="stage-ind num" aria-label={`Stage ${p.stage.n}, hand ${p.stage.hand}`}>
            <span className="rungs" aria-hidden="true">
              {Array.from({ length: 8 }, (_, i) => <i key={i} className={i < p.stage.cleared ? "done" : i === p.stage.n - 1 ? "now" : ""} />)}
            </span>
            <span className="stage-txt">Stage {p.stage.n}</span>
            <span className="hair" aria-hidden="true" />
            <span className="stage-txt">Hand <Odometer value={p.stage.hand} /></span>
          </div>
        </div>
        <div className="topbar-right">
          <div className="counter num" title="Jevs on the council"><Mark size={14} color="var(--gold)" /><strong>{p.counter.name}</strong><span>×{p.counter.n}</span></div>
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
          {p.seat && <Seat s={p.seat} side="l" highlight={hl} hideCards={p.reveal?.seatId === p.seat.id} />}
          {p.you && <Seat s={p.you} side="r" you />}
        </div>

        {d && (
          <div className={`deliberation ${d.done ? "done" : ""}`} aria-live="polite" aria-label="Council vote">
            <div className="delib-head num">{d.done ? `${d.total} votes in` : `${d.counts.fold + d.counts.call + d.counts.raise} of ${d.total} votes`}{d.carried ? <span>{d.carried}</span> : null}</div>
            {([["fold", "Fold", d.allowed.fold], ["call", d.allowed.fold ? "Call" : "Check", true], ["raise", "Raise", d.allowed.raise]] as const).filter(([, , ok]) => ok).map(([k, label]) => {
              const n = d.counts[k];
              const winner = d.done && n === Math.max(d.counts.fold, d.counts.call, d.counts.raise) && n > 0;
              return (
                <div key={k} className={`delib-row ${k} ${winner ? "winner" : ""}`}>
                  <span>{label}</span>
                  <div className="delib-bar"><i style={{ width: `${d.total ? (n / d.total) * 100 : 0}%` }} /></div>
                  <span className="num">{n}</span>
                </div>
              );
            })}
          </div>
        )}

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
          const cx = p.reveal.heroWon ? 590 : SEAT_X + SEAT_W / 2, cy = p.reveal.heroWon ? 560 : SEAT_Y + 100;
          return (
            <div className="reveal" style={{ "--fx": `${cx - 590}px`, "--fy": `${cy - 372 - 47}px` } as CSSProperties}>
              {p.reveal.hole.map((card) => <div key={card} className="slot"><CardFace card={card} className={hl && hl.has(card) ? "win" : ""} dim={Boolean(hl && !hl.has(card))} /></div>)}
            </div>
          );
        })()}

        {p.flights && p.flights.length > 0 && (
          <div className="flights" aria-hidden="true">
            {p.flights.map((f, fi) => {
              const at = (key: string): [number, number] => key === "pot" ? [590, 104] : key === p.you?.id ? [1180 - SEAT_X - SEAT_W / 2, SEAT_Y + 160] : [SEAT_X + SEAT_W / 2, SEAT_Y + 160];
              const [x0, y0] = at(f.from), [x1, y1] = at(f.to);
              return (
                <div key={f.id} className="chip-fly num" style={{ "--x0": `${x0}px`, "--y0": `${y0}px`, "--x1": `${x1}px`, "--y1": `${y1}px`, "--delay": `${fi * 0.08}s` } as CSSProperties}>
                  <span><ChipIcon />{f.amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}

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
