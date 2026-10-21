"use client";

import { useEffect, useState } from "react";
import { Bot } from "./Bot";
import { STAGES } from "@/game/run";

/** Grid shape and face size for each stage, so every council fits the same square. */
const COLS = [1, 2, 2, 4, 4, 8, 8, 10];
const SIZE = [56, 42, 32, 24, 19, 12, 12, 9];

function Face({ size, delay }: { size: number; delay: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} style={{ animationDelay: `${delay}ms` }} aria-hidden="true">
      <circle cx="10" cy="10" r="10" fill="#f4f1e8" />
      <rect x="5.8" y="7" width="2.8" height="4.6" rx="1.4" fill="#0b1310" />
      <rect x="11.4" y="7" width="2.8" height="4.6" rx="1.4" fill="#0b1310" />
    </svg>
  );
}

/** You against the council, doubling in front of you: 1, 2, 4, 8, 16, 32, 64, 100. Hover a rung to hold a stage. */
export function HeroDuel() {
  const [idx, setIdx] = useState(0);
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setIdx(STAGES.length - 1); setHeld(true); }
  }, []);
  useEffect(() => {
    if (held) return;
    const last = idx === STAGES.length - 1;
    const t = setTimeout(() => setIdx(last ? 0 : idx + 1), last ? 2800 : idx === 0 ? 1500 : 1150);
    return () => clearTimeout(t);
  }, [held, idx]);
  const n = STAGES[idx], size = SIZE[idx];
  return (
    <div className="duel-wrap" onMouseLeave={() => setHeld(false)}>
      <div className="duel" aria-label={`You against Jev times ${n}`}>
        <div className="duel-side">
          <div className="avatar"><Bot id="duel-you" variant={4} mood="idle" /></div>
          <span>You</span>
        </div>
        <span className="duel-vs">vs</span>
        <div className="duel-side">
          <div className="duel-council" key={idx} style={{ gridTemplateColumns: `repeat(${COLS[idx]}, ${size}px)` }}>
            {Array.from({ length: n }, (_, i) => <Face key={i} size={size} delay={(i / n) * 420} />)}
          </div>
          <span className="num">Jev ×{n}</span>
        </div>
      </div>
      <div className="duel-stages" role="tablist" aria-label="Stages">
        {STAGES.map((s, i) => (
          <button key={s} type="button" role="tab" aria-selected={i === idx} aria-label={`Stage ${i + 1}, Jev ×${s}`} className={`duel-rung num ${i < idx ? "done" : ""} ${i === idx ? "now" : ""}`} style={{ "--h": `${6 + i * 1.6}px` } as React.CSSProperties} onMouseEnter={() => { setIdx(i); setHeld(true); }} onFocus={() => { setIdx(i); setHeld(true); }} onClick={() => { setIdx(i); setHeld(true); }}>
            <i /><span>×{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
