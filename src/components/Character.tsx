import type { CSSProperties } from "react";

export type Mood = "idle" | "think" | "fold" | "raise" | "allin" | "win" | "lose" | "out";

/** Small deterministic hash so the same seat always gets the same look. */
function seed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const ORBS = [["#4b5a66", "#1c2329"], ["#5a5565", "#221f2a"], ["#3f5f58", "#182622"]];
const SKINS = ["#f1c9a5", "#d9a06c", "#b97a4b", "#8d5a3b", "#f4d9c3", "#c68642"];
const HAIRS = ["#1f1a17", "#4a2c1a", "#2b2b2b", "#8a5a2b", "#d9c27a", "#5b3a29"];
const SHIRTS = ["#1f5244", "#243b55", "#4a3254", "#5a3b2a", "#2a2a2a", "#6b4a2b"];

/**
 * A seat's face. Jev is a living orb (three variants); everyone else is a person (three variants).
 * The look is seeded by the seat id, and the expression follows the seat's state.
 */
export function Character({ id, model, mood = "idle", variant, className = "" }: { id: string; model: string; mood?: Mood; variant?: number; className?: string }) {
  const h = seed(id);
  const v = variant ?? h % 3;
  const style = { "--blink-delay": `${(h % 37) / 10}s`, "--float-delay": `${(h % 23) / 10}s` } as CSSProperties;
  const closed = mood === "fold" || mood === "out";
  const wide = mood === "allin";
  const uid = `g-${id.replace(/[^a-z0-9]/gi, "")}`;

  if (model === "jev") {
    const [shell, dark] = ORBS[v];
    const eyeRy = closed ? 0.9 : wide ? 7 : mood === "think" ? 2 : mood === "win" ? 3 : 3.2;
    const eyeShift = mood === "think" ? "translate(3px, -3px)" : mood === "raise" ? "translate(0, 1.5px)" : "none";
    return (
      <svg viewBox="0 0 120 120" className={`char char-jev orb-${v} mood-${mood} ${className}`} style={style} aria-hidden="true">
        <defs>
          <clipPath id={`${uid}-c`}><circle cx="60" cy="60" r="60" /></clipPath>
          <radialGradient id={`${uid}-o`} cx="38%" cy="32%" r="70%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" /><stop offset="35%" stopColor={shell} /><stop offset="100%" stopColor={dark} /></radialGradient>
          <radialGradient id={`${uid}-g`} cx="50%" cy="50%" r="50%"><stop offset="55%" stopColor="var(--gold)" stopOpacity="0.28" /><stop offset="100%" stopColor="var(--gold)" stopOpacity="0" /></radialGradient>
        </defs>
        <g clipPath={`url(#${uid}-c)`}>
          <rect width="120" height="120" fill={dark} />
          <circle cx="60" cy="60" r="60" fill="#0c1512" />
          <circle cx="60" cy="62" r="52" fill={`url(#${uid}-g)`} className="orb-glow" />
          <g className="char-body">
            {v === 1 && <ellipse cx="60" cy="62" rx="50" ry="11" fill="none" stroke="var(--gold)" strokeOpacity="0.55" strokeWidth="2.2" className="orb-halo" />}
            <circle cx="60" cy="58" r="36" fill={`url(#${uid}-o)`} />
            <ellipse cx="48" cy="40" rx="11" ry="5" fill="#fff" opacity="0.22" transform="rotate(-25 48 40)" />
            {v === 2 && <circle cx="60" cy="58" r="14" fill="var(--gold)" opacity="0.18" className="orb-core" />}
            {v === 2 ? (
              <g className="orb-dots" style={{ transform: eyeShift }}>
                {[-11, 0, 11].map((dx, i) => <circle key={i} cx={60 + dx} cy={58} r={closed ? 1.2 : wide ? 4.4 : 3.2} fill="var(--gold)" className={`dot dot-${i}`} />)}
              </g>
            ) : (
              <g className="char-pupils" style={{ transform: eyeShift }}>
                <ellipse className="eye" cx={v === 1 ? 60 : 49} cy="56" rx={v === 1 ? 16 : 7} ry={eyeRy} fill="var(--gold)" />
                {v !== 1 && <ellipse className="eye" cx="71" cy="56" rx="7" ry={eyeRy} fill="var(--gold)" />}
              </g>
            )}
            {v === 1 && <ellipse cx="60" cy="62" rx="50" ry="11" fill="none" stroke="var(--gold)" strokeOpacity="0.9" strokeWidth="2.2" className="orb-halo-front" />}
          </g>
        </g>
      </svg>
    );
  }

  const skin = SKINS[(h >> 3) % SKINS.length], hair = HAIRS[(h >> 6) % HAIRS.length], shirt = SHIRTS[(h >> 9) % SHIRTS.length];
  const eyeRy = closed ? 0.8 : wide ? 5.2 : mood === "win" ? 2.6 : 4.2;
  const browUp = mood === "think" || wide;
  const browDown = mood === "raise";
  const pupil = mood === "think" ? "translate(2px, -2px)" : mood === "raise" ? "translate(0, 1px)" : "none";
  return (
    <svg viewBox="0 0 120 120" className={`char char-human human-${v} mood-${mood} ${className}`} style={style} aria-hidden="true">
      <defs>
        <clipPath id={`${uid}-c`}><circle cx="60" cy="60" r="60" /></clipPath>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#efe9da" /><stop offset="100%" stopColor="#d9d1be" /></linearGradient>
      </defs>
      <g clipPath={`url(#${uid}-c)`}>
        <rect width="120" height="120" fill={`url(#${uid}-bg)`} />
        <g className="char-body">
          <path d="M12 124 C16 92 104 92 108 124 Z" fill={shirt} />
          <path d="M44 93 L60 104 L76 93 L76 88 L44 88 Z" fill={skin} opacity="0.9" />
          <rect x="51" y="72" width="18" height="18" rx="7" fill={skin} />
          <ellipse cx="33" cy="58" rx="5" ry="6.5" fill={skin} />
          <ellipse cx="87" cy="58" rx="5" ry="6.5" fill={skin} />
          <path d="M34 50 C34 22 86 22 86 50 L86 62 C86 78 74 86 60 86 C46 86 34 78 34 62 Z" fill={skin} />
          {v === 0 && <path d="M33 52 C33 20 87 20 87 52 L87 46 C82 32 38 32 33 46 Z" fill={hair} />}
          {v === 1 && <><path d="M32 54 C30 18 92 16 88 50 C82 36 72 42 60 36 C50 42 40 42 32 54 Z" fill={hair} /><path d="M86 48 C92 60 90 74 84 80 L84 56 Z" fill={hair} /></>}
          {v === 2 && <><path d="M33 48 C35 24 85 24 87 48 L87 40 C80 28 40 28 33 40 Z" fill={hair} /><circle cx="60" cy="22" r="10" fill={hair} /></>}
          {v === 1 && <g stroke="#1a1512" strokeWidth="1.8" fill="none" opacity="0.7"><circle cx="49" cy="57" r="8" /><circle cx="71" cy="57" r="8" /><path d="M57 57 L63 57" /></g>}
          <g className="char-pupils" style={{ transform: pupil }}>
            <ellipse className="eye" cx="49" cy="57" rx="3.6" ry={eyeRy} fill="#1a1512" />
            <ellipse className="eye" cx="71" cy="57" rx="3.6" ry={eyeRy} fill="#1a1512" />
            {!closed && <><circle cx="50.3" cy="55.4" r="1.1" fill="#fff" /><circle cx="72.3" cy="55.4" r="1.1" fill="#fff" /></>}
          </g>
          <path d={browUp ? "M43 47 L55 45" : browDown ? "M43 45 L55 49" : "M43 47.5 L55 47.5"} stroke="#1a1512" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
          <path d={browUp ? "M65 45 L77 47" : browDown ? "M65 49 L77 45" : "M65 47.5 L77 47.5"} stroke="#1a1512" strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
          <ellipse cx="60" cy="64" rx="2.4" ry="1.6" fill="#1a1512" opacity="0.18" />
          <path d={mood === "win" ? "M50 70 Q60 80 70 70" : mood === "lose" ? "M51 74 Q60 67 69 74" : wide ? "M55 70 Q60 77 65 70 Q60 72 55 70" : mood === "raise" ? "M51 71 Q60 76 69 70" : "M52 72 Q60 75 68 72"} stroke="#1a1512" strokeWidth="2.4" strokeLinecap="round" fill={wide ? "#1a1512" : "none"} className="char-mouth" />
          <ellipse cx="43" cy="66" rx="4" ry="2.2" fill="#e8846b" opacity="0.25" />
          <ellipse cx="77" cy="66" rx="4" ry="2.2" fill="#e8846b" opacity="0.25" />
        </g>
      </g>
    </svg>
  );
}
