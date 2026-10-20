"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export const WINDOW_W = 1180;
export const WINDOW_H = 750;
export const MOBILE_BREAK = 720;

/**
 * The table is laid out on a fixed 1180 x 750 canvas. Between phone and full width it scales down
 * as one piece, so seats, cards and the arc keep their composition. Under MOBILE_BREAK the
 * stylesheet switches to the stacked phone layout and no scaling is applied.
 */
export function WindowFit({ children, min = 0.5, fitHeight = false }: { children: ReactNode; min?: number; fitHeight?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      setMobile(window.innerWidth < MOBILE_BREAK);
      let s = w / WINDOW_W;
      if (fitHeight) s = Math.min(s, (window.innerHeight - 48) / WINDOW_H);
      setScale(Math.max(min, Math.min(1, s)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener("resize", compute);
    return () => { ro.disconnect(); window.removeEventListener("resize", compute); };
  }, [min, fitHeight]);
  if (mobile) return <div ref={ref} className="window-fit is-mobile">{children}</div>;
  return (
    <div ref={ref} className="window-fit" style={{ height: WINDOW_H * scale }}>
      <div className="window-scale" style={{ transform: `translateX(-50%) scale(${scale})`, left: `max(50%, ${(scale * WINDOW_W) / 2}px)` }}>{children}</div>
    </div>
  );
}
