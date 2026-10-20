"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const WINDOW_W = 1180;
export const WINDOW_H = 750;

/**
 * The table is laid out on a fixed 1180 x 750 canvas. Below that width (or, with `fitHeight`,
 * below that height) the whole window scales down as one piece, so seats, cards and the arc keep
 * their composition on laptops, tablets and phones. Under `min` it scales no further and pans.
 */
export function WindowFit({ children, min = 0.5, fitHeight = false }: { children: ReactNode; min?: number; fitHeight?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      let s = el.clientWidth / WINDOW_W;
      if (fitHeight) s = Math.min(s, (window.innerHeight - 48) / WINDOW_H);
      setScale(Math.max(min, Math.min(1, s)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => { ro.disconnect(); window.removeEventListener("resize", compute); };
  }, [min, fitHeight]);
  const w = Math.max(scale * WINDOW_W, 0);
  return (
    <div ref={ref} className="window-fit" style={{ height: WINDOW_H * scale }}>
      <div className="window-scale" style={{ transform: `translateX(-50%) scale(${scale})`, left: `max(50%, ${w / 2}px)` }}>{children}</div>
    </div>
  );
}
