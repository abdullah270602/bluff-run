"use client";

import { useEffect, useRef } from "react";

export type Mood = "idle" | "think" | "fold" | "raise" | "allin" | "win" | "lose" | "out";

/**
 * A small expressive blob in the spirit of the x.ai bot: one solid head, two eye cut-outs set
 * off-centre, and everything driven by damped springs (position, tilt, squash, eye open, eye size,
 * gaze) layered over per-state motion, random blinks and gaze drift. No keyframes; a rAF loop.
 */

// Head outlines in a 120 x 120 box, with where the face sits and how far apart the eyes are.
export interface Shape { d: string; face: { x: number; y: number; gap: number; r: number; tilt: number } }
export const SHAPES: Shape[] = [
  // 0 blob: a hand-pinched circle
  { d: "M60 20 C84 18 100 36 100 60 C100 86 82 102 58 102 C34 102 20 84 20 60 C20 36 38 22 60 20 Z", face: { x: 66, y: 52, gap: 22, r: 7.5, tilt: 0 } },
  // 1 pebble: wider, flatter bottom
  { d: "M58 26 C86 24 104 40 104 62 C104 84 86 98 58 98 C32 98 16 86 16 62 C16 40 32 28 58 26 Z", face: { x: 66, y: 54, gap: 24, r: 7, tilt: -2 } },
  // 2 bean
  { d: "M54 22 C78 18 100 34 102 58 C104 82 90 100 66 102 C44 104 24 92 20 70 C16 48 30 26 54 22 Z", face: { x: 68, y: 50, gap: 21, r: 7.2, tilt: -6 } },
  // 3 egg
  { d: "M60 18 C80 18 98 40 98 64 C98 86 82 102 60 102 C38 102 22 86 22 64 C22 40 40 18 60 18 Z", face: { x: 65, y: 52, gap: 21, r: 7.2, tilt: 0 } },
  // 4 squircle
  { d: "M60 20 C92 20 100 28 100 60 C100 92 92 100 60 100 C28 100 20 92 20 60 C20 28 28 20 60 20 Z", face: { x: 66, y: 52, gap: 24, r: 7.8, tilt: 0 } },
  // 5 hex, rounded
  { d: "M60 18 C64 18 68 20 72 22 L92 34 C96 36 98 40 98 44 L98 76 C98 80 96 84 92 86 L72 98 C68 100 64 102 60 102 C56 102 52 100 48 98 L28 86 C24 84 22 80 22 76 L22 44 C22 40 24 36 28 34 L48 22 C52 20 56 18 60 18 Z", face: { x: 66, y: 52, gap: 22, r: 7.2, tilt: 0 } },
  // 6 gem: flat top, pointed bottom
  { d: "M40 24 L80 24 C86 24 90 26 94 32 L104 50 C106 54 106 58 102 62 L66 100 C62 104 58 104 54 100 L18 62 C14 58 14 54 16 50 L26 32 C30 26 34 24 40 24 Z", face: { x: 66, y: 50, gap: 22, r: 7, tilt: 0 } },
  // 7 cloud
  { d: "M44 40 C46 26 70 24 76 38 C92 34 104 48 98 62 C106 76 92 90 78 86 C70 100 44 100 38 86 C22 90 12 72 24 60 C14 48 28 34 44 40 Z", face: { x: 66, y: 56, gap: 22, r: 7, tilt: 0 } },
];

const FIXED = 1 / 120;
type Spring = { x: number; v: number; t: number };
const spring = (x: number): Spring => ({ x, v: 0, t: x });
function step(s: Spring, f: number, damping: number, dt: number) {
  s.v += (-2 * damping * f * s.v - f * f * (s.x - s.t)) * dt;
  s.x += s.v * dt;
  if (!Number.isFinite(s.x)) { s.x = s.t; s.v = 0; }
}
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const K = 0.42; // the reference moves in a 229-unit box; ours is 120

export function Bot({ id, variant = 0, light = false, mood = "idle", className = "" }: { id: string; variant?: number; light?: boolean; mood?: Mood; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const moodRef = useRef<Mood>(mood);
  moodRef.current = mood;
  const shape = SHAPES[variant % SHAPES.length];

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const head = svg.querySelector<SVGGElement>("[data-head]")!;
    const eyes = Array.from(svg.querySelectorAll<SVGGElement>("[data-eye]"));
    const lids = Array.from(svg.querySelectorAll<SVGElement>("[data-lid]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const S = { rot: spring(0), x: spring(0), y: spring(0), sy: spring(1), open: spring(1), size: spring(1), aimX: spring(0), aimY: spring(0), happy: spring(0) };
    const t0 = performance.now() - Math.random() * 10000;
    let last = performance.now(), moodSince = last, lastMood: Mood = moodRef.current;
    let blinkNext = last + rnd(1800, 4500), blinkUntil = 0, winkEye = -1, winkUntil = 0, gazeNext = 0, raf = 0, hidden = false;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const m = moodRef.current;
      if (m !== lastMood) { lastMood = m; moodSince = now; gazeNext = 0; if (m === "allin" || m === "win") S.y.v -= 60; }
      const t = (now - t0) / 1000, el = (now - moodSince) / 1000;
      let rot = 0, x = 0, y = 0, sy = 1, open = 1, size = 1, happy = 0;
      switch (m) {
        case "idle": rot = 1.5 * Math.sin(0.5 * t) + 0.6 * Math.sin(0.17 * t); x = Math.sin(0.27 * t); y = 1.2 * Math.sin(0.85 * t); sy = 1 + 0.007 * Math.sin(0.85 * t); break;
        case "think": rot = -9 + 5 * Math.sin(0.35 * t); x = 5 * Math.sin(0.3 * t); y = 2.5 * Math.sin(0.6 * t); open = 0.82; break;
        case "raise": rot = -6 + 3 * Math.sin(0.3 * t); x = -4 * Math.sin(0.25 * t); y = 1 + 1.2 * Math.sin(0.45 * t); open = 0.72; size = 1.02; break;
        case "allin": {
          if (el < 1.1) { const s = Math.min(el / 1.1, 1); y = -8 * (1 - s); sy = el < 0.2 ? 1.08 : 1; size = 1.18 - 0.08 * s; rot = 1.5 * Math.sin(11 * t) * (1 - s); open = 1.1; }
          else { const ph = (2.2 * t) % 1; y = -10 * Math.sin(ph * Math.PI) + 2; sy = ph < 0.1 ? 0.92 : ph < 0.3 ? 1.05 : 1; x = 4 * Math.sin(1.1 * t); size = 1.08; rot = 7 * Math.sin(t * Math.PI * 2.2); }
          break;
        }
        case "fold": rot = 2.5 * Math.sin(0.32 * t); x = 1.5 * Math.sin(0.2 * t); y = 6 + 2.2 * Math.sin(0.36 * t); sy = 1 + 0.022 * Math.sin(0.36 * t); open = 0.3 + 0.06 * Math.sin(0.8 * t); break;
        case "lose": rot = 3 + 2 * Math.sin(0.3 * t); x = 1.5 * Math.sin(0.25 * t); y = 7 + Math.sin(0.4 * t); sy = 0.97; size = 0.97; open = 0.62; break;
        case "win": { const w = Math.sin(2.4 * t); rot = 3 * Math.sin(1.2 * t); x = 2.5 * Math.sin(1.1 * t); y = -3 * Math.abs(w); sy = 1 + 0.02 * w; size = 1.05; happy = 1; break; }
        case "out": rot = 4 + 2 * Math.sin(0.25 * t); x = -2; y = 8 + 3 * Math.sin(0.55 * t); sy = 1 + 0.016 * Math.sin(0.55 * t); open = 0.08; break;
      }
      // gaze drift
      if (now >= gazeNext) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        let gx = 15 * rnd(-0.4, 0.4), gy = 9 * rnd(-0.3, 0.3), min = 2500, max = 5000;
        if (m === "think") { gx = dir * rnd(0.5, 1) * 15; gy = -9 * rnd(0.4, 1); min = 1500; max = 2800; }
        else if (m === "raise") { gx = 15 * dir; gy = 2.7; min = 2200; max = 4200; }
        else if (m === "allin") { gx = 15 * rnd(-1, 1); gy = 9 * rnd(-1, 0.3); min = 700; max = 1400; }
        else if (m === "fold" || m === "lose") { gx = 15 * rnd(-0.3, 0.3); gy = 9 * rnd(0.6, 1); min = 2800; max = 5000; }
        else if (m === "win") { gx = 15 * rnd(-0.7, 0.7); gy = -9 * rnd(0, 0.6); min = 1800; max = 3400; }
        else if (m === "out") { gx = 0; gy = 4; min = 4000; max = 7000; }
        S.aimX.t = gx * K; S.aimY.t = gy * K;
        gazeNext = now + rnd(min, max);
      }
      // blinks and the occasional wink
      if (m !== "out" && m !== "fold" && now >= blinkNext) { blinkUntil = now + 95; blinkNext = now + rnd(2200, 5200); if ((m === "idle" || m === "win") && Math.random() < 0.18) { winkEye = Math.random() < 0.5 ? 0 : 1; winkUntil = now + 260; } }
      const blinking = now < blinkUntil;

      S.rot.t = rot * Math.PI / 180; S.x.t = x * K; S.y.t = y * K; S.sy.t = sy; S.open.t = blinking ? 0.06 : open; S.size.t = size; S.happy.t = happy;
      const n = Math.max(1, Math.ceil(dt / FIXED)), h = dt / n;
      for (let i = 0; i < n; i++) {
        step(S.rot, 5, 0.9, h); step(S.x, 3.5, 1, h); step(S.y, 4, 1, h); step(S.sy, 10, 0.8, h);
        step(S.open, 26, 1, h); step(S.size, 9, 0.85, h); step(S.aimX, 13, 1, h); step(S.aimY, 13, 1, h); step(S.happy, 8, 1, h);
      }
      if (reduce) { S.rot.x = 0; S.x.x = 0; S.y.x = 0; S.sy.x = 1; S.open.x = open; S.size.x = size; S.aimX.x = 0; S.aimY.x = 0; S.happy.x = happy; }

      head.setAttribute("transform", `translate(${60 + S.x.x} ${60 + S.y.x}) rotate(${(S.rot.x * 180) / Math.PI}) scale(1 ${S.sy.x}) translate(-60 -60)`);
      eyes.forEach((eye, i) => {
        const wink = now < winkUntil && winkEye === i;
        const o = Math.max(0.04, wink ? 0.06 : S.open.x);
        const ex = Number(eye.dataset.x), ey = Number(eye.dataset.y);
        eye.setAttribute("transform", `translate(${ex + S.aimX.x} ${ey + S.aimY.x}) rotate(${shape.face.tilt}) scale(${S.size.x} ${S.size.x * o})`);
        lids[i]?.setAttribute("transform", `translate(0 ${-14 + 14 * (1 - S.happy.x)})`);
      });
    };
    raf = requestAnimationFrame(frame);
    const io = new IntersectionObserver(([e]) => { hidden = !e.isIntersecting; });
    io.observe(svg);
    const onVis = () => { hidden = document.hidden; };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelAnimationFrame(raf); io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, [shape]);

  const bg = light ? "#e9e4d6" : "#0e1714";
  const fill = light ? "#141c19" : "#ebe6d8";
  const uid = `b-${id.replace(/[^a-z0-9]/gi, "")}`;
  const { x: fx, y: fy, gap, r } = shape.face;
  return (
    <svg ref={ref} viewBox="0 0 120 120" className={`bot ${light ? "bot-light" : "bot-dark"} ${className}`} aria-hidden="true">
      <defs>
        <clipPath id={`${uid}-c`}><circle cx="60" cy="60" r="60" /></clipPath>
        <clipPath id={`${uid}-h`}><path d={shape.d} /></clipPath>
      </defs>
      <g clipPath={`url(#${uid}-c)`}>
        <rect width="120" height="120" fill={bg} />
        <g data-head>
          <path d={shape.d} fill={fill} />
          <g clipPath={`url(#${uid}-h)`}>
            {[fx - gap / 2, fx + gap / 2].map((ex, i) => (
              <g key={i} data-eye data-x={ex} data-y={fy}>
                <ellipse cx="0" cy="0" rx={r} ry={r * 1.18} fill={bg} />
                <ellipse data-lid cx="0" cy={r * 1.6} rx={r * 1.4} ry={r * 1.15} fill={fill} />
              </g>
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}
