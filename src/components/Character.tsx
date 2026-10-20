import type { CSSProperties } from "react";

export type Mood = "idle" | "think" | "fold" | "raise" | "allin" | "win" | "lose" | "out";

/** Small deterministic hash so the same seat always gets the same look. */
function seed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const SHELLS = [["#2b3a3f", "#1a2529"], ["#3b3f52", "#242737"], ["#2f4a44", "#1d2f2b"], ["#474352", "#2b2834"], ["#35474f", "#1f2d33"]];
const SKINS = ["#f1c9a5", "#d9a06c", "#b97a4b", "#8d5a3b", "#f4d9c3"];
const HAIRS = ["#1f1a17", "#4a2c1a", "#2b2b2b", "#8a5a2b", "#d9c27a"];
const SHIRTS = ["#1f5244", "#243b55", "#4a3254", "#5a3b2a", "#2a2a2a"];

/**
 * A seat's face. Jev is a machine with a visor; everyone else is a person. The look is seeded by
 * the seat id, and the expression follows the seat's state.
 */
export function Character({ id, model, mood = "idle", className = "" }: { id: string; model: string; mood?: Mood; className?: string }) {
  const h = seed(id);
  const blinkDelay = `${(h % 37) / 10}s`;
  const style = { "--blink-delay": blinkDelay } as CSSProperties;
  const closed = mood === "fold" || mood === "out";
  const wide = mood === "allin";
  const pupil = mood === "think" ? "translate(2.2px, -2.4px)" : mood === "raise" ? "translate(0, 1px)" : "none";

  if (model === "jev") {
    const [shell, dark] = SHELLS[h % SHELLS.length];
    const eye = closed ? 1.2 : wide ? 7 : mood === "win" ? 4 : 5;
    return (
      <svg viewBox="0 0 120 120" className={`char char-jev mood-${mood} ${className}`} style={style} aria-hidden="true">
        <defs><clipPath id={`c-${id}`}><circle cx="60" cy="60" r="60" /></clipPath></defs>
        <g clipPath={`url(#c-${id})`}>
          <rect width="120" height="120" fill={dark} />
          <circle cx="60" cy="60" r="60" fill={shell} />
          <g className="char-body">
            <path d="M14 122 C18 92 102 92 106 122 Z" fill={dark} />
            <rect x="50" y="76" width="20" height="14" rx="6" fill={dark} />
            <rect x="29" y="26" width="62" height="56" rx="22" fill={dark} stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
            <rect x="36" y="42" width="48" height="22" rx="11" fill="#0a1210" />
            <g className="char-pupils" style={{ transform: pupil }}>
              <ellipse className="eye" cx="49" cy="53" rx="4.6" ry={eye} fill="var(--gold)" />
              <ellipse className="eye" cx="71" cy="53" rx="4.6" ry={eye} fill="var(--gold)" />
            </g>
            <circle cx="60" cy="18" r="4" fill="var(--gold)" opacity={mood === "think" ? 1 : 0.35} className="char-lamp" />
            <rect x="26" y="46" width="5" height="14" rx="2.5" fill="rgba(255,255,255,0.14)" />
            <rect x="89" y="46" width="5" height="14" rx="2.5" fill="rgba(255,255,255,0.14)" />
            <path d={mood === "win" ? "M50 71 Q60 78 70 71" : mood === "lose" ? "M51 74 Q60 68 69 74" : mood === "raise" ? "M50 72 L70 70" : "M52 72 L68 72"} stroke="rgba(255,255,255,0.45)" strokeWidth="2.4" strokeLinecap="round" fill="none" className="char-mouth" />
          </g>
        </g>
      </svg>
    );
  }

  const skin = SKINS[(h >> 3) % SKINS.length], hair = HAIRS[(h >> 6) % HAIRS.length], shirt = SHIRTS[(h >> 9) % SHIRTS.length];
  const hairStyle = (h >> 12) % 3;
  const eyeRy = closed ? 0.8 : wide ? 6 : mood === "win" ? 3.2 : 5;
  const browUp = mood === "think" || wide;
  const browDown = mood === "raise";
  return (
    <svg viewBox="0 0 120 120" className={`char char-human mood-${mood} ${className}`} style={style} aria-hidden="true">
      <defs><clipPath id={`c-${id}`}><circle cx="60" cy="60" r="60" /></clipPath></defs>
      <g clipPath={`url(#c-${id})`}>
        <circle cx="60" cy="60" r="60" fill="#e9e4d6" />
        <g className="char-body">
          <path d="M16 122 C20 90 100 90 104 122 Z" fill={shirt} />
          <rect x="51" y="74" width="18" height="16" rx="7" fill={skin} />
          <rect x="33" y="28" width="54" height="54" rx="24" fill={skin} />
          {hairStyle === 0 && <path d="M33 50 C33 24 87 24 87 50 L87 44 C84 34 36 34 33 44 Z" fill={hair} />}
          {hairStyle === 1 && <path d="M31 52 C30 22 92 20 89 50 C80 38 70 42 58 36 C50 44 40 44 31 52 Z" fill={hair} />}
          {hairStyle === 2 && <><path d="M33 48 C35 26 85 26 87 48 L87 40 C80 30 40 30 33 40 Z" fill={hair} /><circle cx="60" cy="24" r="9" fill={hair} /></>}
          <g className="char-pupils" style={{ transform: pupil }}>
            <ellipse className="eye" cx="49" cy="56" rx="3.8" ry={eyeRy} fill="#1a1512" />
            <ellipse className="eye" cx="71" cy="56" rx="3.8" ry={eyeRy} fill="#1a1512" />
            {!closed && <><circle cx="50.3" cy="54.2" r="1.1" fill="#fff" /><circle cx="72.3" cy="54.2" r="1.1" fill="#fff" /></>}
          </g>
          <path d={browUp ? "M43 46 L55 44" : browDown ? "M43 44 L55 48" : "M43 46 L55 46"} stroke="#1a1512" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
          <path d={browUp ? "M65 44 L77 46" : browDown ? "M65 48 L77 44" : "M65 46 L77 46"} stroke="#1a1512" strokeWidth="2.2" strokeLinecap="round" opacity="0.75" />
          <path d={mood === "win" ? "M50 68 Q60 78 70 68" : mood === "lose" ? "M51 72 Q60 65 69 72" : wide ? "M55 68 Q60 75 65 68 Q60 70 55 68" : mood === "raise" ? "M51 69 Q60 74 69 68" : "M52 70 Q60 73 68 70"} stroke="#1a1512" strokeWidth="2.4" strokeLinecap="round" fill={wide ? "#1a1512" : "none"} className="char-mouth" />
        </g>
      </g>
    </svg>
  );
}
