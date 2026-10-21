"use client";

import { useEffect, useState } from "react";
import { REPO } from "./SiteFoot";

const SHOW_FROM = 10;
const KEY = "bluff-run:stars";

/** A star link to the repo. The count appears once there is a count worth showing. */
export function StarButton({ className = "" }: { className?: string }) {
  const [stars, setStars] = useState<number | null>(null);
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(KEY);
      if (cached) { setStars(Number(cached)); return; }
    } catch { /* no storage */ }
    fetch(`https://api.github.com/repos/${REPO}`, { headers: { Accept: "application/vnd.github+json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const n = typeof d?.stargazers_count === "number" ? d.stargazers_count : null;
        if (n === null) return;
        setStars(n);
        try { sessionStorage.setItem(KEY, String(n)); } catch { /* no storage */ }
      })
      .catch(() => { /* offline or rate-limited: just the link */ });
  }, []);
  return (
    <a href={`https://github.com/${REPO}`} target="_blank" rel="noopener noreferrer" className={`pill star-btn ${className}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6Z" /></svg>
      Star on GitHub
      {stars !== null && stars > SHOW_FROM && <span className="pill-sub num">{stars.toLocaleString()}</span>}
    </a>
  );
}
