import type { CSSProperties } from "react";

export type Mood = "idle" | "think" | "fold" | "raise" | "allin" | "win" | "lose" | "out";

/** Small deterministic hash so the same seat always gets the same look. */
function seed(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/**
 * Eight Jevs: soft blobs, each with a silhouette that nods to the cards and one prop.
 * 0 pip (round), 1 spade, 2 heart, 3 diamond, 4 club, 5 visor, 6 monocle, 7 halo.
 */
const JEV_SKINS: [string, string][] = [
  ["#8fb3a8", "#4d6e65"], ["#6f7f93", "#3a4858"], ["#c9918f", "#7a4b4a"], ["#d4b483", "#8a6f3f"],
  ["#7f9f78", "#43603e"], ["#9a8fb5", "#564c70"], ["#b9a58e", "#6f5f4d"], ["#8ca4b8", "#4a5f73"],
];
const BODY = [
  "M60 22 C82 22 96 38 96 60 C96 82 80 96 60 96 C40 96 24 82 24 60 C24 38 38 22 60 22 Z",
  "M60 18 C70 34 94 44 94 64 C94 80 82 90 68 88 C66 94 70 100 76 104 L44 104 C50 100 54 94 52 88 C38 90 26 80 26 64 C26 44 50 34 60 18 Z",
  "M60 100 C40 84 22 70 22 50 C22 36 32 26 44 26 C52 26 58 30 60 36 C62 30 68 26 76 26 C88 26 98 36 98 50 C98 70 80 84 60 100 Z",
  "M60 18 C72 34 90 48 94 60 C90 72 72 86 60 102 C48 86 30 72 26 60 C30 48 48 34 60 18 Z",
  "M60 20 C72 20 80 30 78 40 C90 38 100 48 98 60 C96 72 86 78 76 76 C74 86 78 96 84 102 L36 102 C42 96 46 86 44 76 C34 78 24 72 22 60 C20 48 30 38 42 40 C40 30 48 20 60 20 Z",
  "M60 22 C82 22 96 38 96 60 C96 82 80 96 60 96 C40 96 24 82 24 60 C24 38 38 22 60 22 Z",
  "M60 22 C82 22 96 38 96 60 C96 82 80 96 60 96 C40 96 24 82 24 60 C24 38 38 22 60 22 Z",
  "M60 28 C80 28 94 42 94 62 C94 82 80 96 60 96 C40 96 26 82 26 62 C26 42 40 28 60 28 Z",
];
// where the face sits for each silhouette
const FACE_Y = [58, 62, 54, 58, 60, 62, 58, 62];

const SKINS = ["#f1c9a5", "#d9a06c", "#b97a4b", "#8d5a3b", "#f4d9c3", "#c68642"];
const HAIRS = ["#1f1a17", "#4a2c1a", "#2b2b2b", "#8a5a2b", "#d9c27a", "#5b3a29"];
const SHIRTS = ["#1f5244", "#243b55", "#4a3254", "#5a3b2a", "#2a2a2a", "#6b4a2b"];

export const JEV_VARIANTS = 8;
export const HUMAN_VARIANTS = 4;

export function Character({ id, model, mood = "idle", variant, className = "" }: { id: string; model: string; mood?: Mood; variant?: number; className?: string }) {
  const h = seed(id);
  const closed = mood === "fold" || mood === "out";
  const wide = mood === "allin";
  const uid = `g-${id.replace(/[^a-z0-9]/gi, "")}`;
  const style = { "--blink-delay": `${(h % 37) / 10}s`, "--float-delay": `${(h % 23) / 10}s` } as CSSProperties;
  const look = mood === "think" ? "translate(2.5px, -2.5px)" : mood === "raise" ? "translate(0, 1.5px)" : "none";

  if (model === "jev") {
    const v = (variant ?? h % JEV_VARIANTS) % JEV_VARIANTS;
    const [light, dark] = JEV_SKINS[v];
    const fy = FACE_Y[v];
    const eyeR = closed ? 0.8 : wide ? 5.4 : mood === "win" ? 3.2 : 4.2;
    const mouth = mood === "win" ? `M52 ${fy + 12} Q60 ${fy + 20} 68 ${fy + 12}`
      : mood === "lose" ? `M53 ${fy + 16} Q60 ${fy + 10} 67 ${fy + 16}`
      : wide ? `M56 ${fy + 12} Q60 ${fy + 19} 64 ${fy + 12} Q60 ${fy + 14} 56 ${fy + 12}`
      : mood === "raise" ? `M53 ${fy + 13} Q60 ${fy + 17} 67 ${fy + 11}`
      : mood === "think" ? `M55 ${fy + 14} L65 ${fy + 14}`
      : `M54 ${fy + 13} Q60 ${fy + 16} 66 ${fy + 13}`;
    return (
      <svg viewBox="0 0 120 120" className={`char char-jev jev-${v} mood-${mood} ${className}`} style={style} aria-hidden="true">
        <defs>
          <clipPath id={`${uid}-c`}><circle cx="60" cy="60" r="60" /></clipPath>
          <radialGradient id={`${uid}-b`} cx="38%" cy="30%" r="75%"><stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" /><stop offset="30%" stopColor={light} /><stop offset="100%" stopColor={dark} /></radialGradient>
        </defs>
        <g clipPath={`url(#${uid}-c)`}>
          <circle cx="60" cy="60" r="60" fill="#0c1512" />
          <circle cx="60" cy="64" r="48" fill={light} opacity="0.12" className="orb-glow" />
          <g className="char-body">
            <ellipse cx="60" cy="104" rx="26" ry="4" fill="#000" opacity="0.28" />
            <path d={BODY[v]} fill={`url(#${uid}-b)`} />
            <ellipse cx="47" cy="40" rx="10" ry="4.5" fill="#fff" opacity="0.28" transform="rotate(-28 47 40)" />
            {v === 7 && <ellipse cx="60" cy="18" rx="18" ry="5" fill="none" stroke="var(--gold)" strokeWidth="2.4" className="halo" />}
            {v === 5 && <><path d="M26 50 C36 36 84 36 94 50 L94 56 C84 44 36 44 26 56 Z" fill="#1d2a26" /><path d="M20 54 C40 46 80 46 100 54 L98 60 C78 52 42 52 22 60 Z" fill="var(--gold)" opacity="0.9" /></>}
            {v === 6 && <><circle cx="71" cy={fy} r="9" fill="none" stroke="var(--gold)" strokeWidth="2" /><path d={`M80 ${fy + 2} L88 ${fy + 14}`} stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" /></>}
            {v === 4 && <><path d="M52 92 L60 88 L68 92 L60 96 Z" fill="#1d2a26" /><circle cx="60" cy="92" r="2" fill="var(--gold)" /></>}
            {v === 2 && <><ellipse cx="42" cy={fy + 8} rx="5" ry="3" fill="#e8846b" opacity="0.5" /><ellipse cx="78" cy={fy + 8} rx="5" ry="3" fill="#e8846b" opacity="0.5" /></>}
            <g className="char-pupils" style={{ transform: look }}>
              <ellipse className="eye" cx="49" cy={fy} rx={v === 3 ? 3.6 : 4.2} ry={eyeR} fill="#121a17" />
              <ellipse className="eye" cx="71" cy={fy} rx={v === 3 ? 5 : 4.2} ry={v === 3 ? eyeR * 1.2 : eyeR} fill="#121a17" />
              {!closed && <><circle cx="50.5" cy={fy - 1.6} r="1.2" fill="#fff" /><circle cx="72.5" cy={fy - 1.6} r="1.2" fill="#fff" /></>}
            </g>
            <path d={mouth} stroke="#121a17" strokeWidth="2.2" strokeLinecap="round" fill={wide ? "#121a17" : "none"} className="char-mouth" />
          </g>
        </g>
      </svg>
    );
  }

  const v = (variant ?? (h >> 2) % HUMAN_VARIANTS) % HUMAN_VARIANTS;
  const skin = SKINS[(h >> 5) % SKINS.length], hair = HAIRS[(h >> 8) % HAIRS.length], shirt = SHIRTS[(h >> 11) % SHIRTS.length];
  const eyeRy = closed ? 0.8 : wide ? 5.2 : mood === "win" ? 2.6 : 4.2;
  const browUp = mood === "think" || wide;
  const browDown = mood === "raise";
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
          {v === 3 && <><circle cx="33" cy="64" r="2.2" fill="var(--gold)" /><circle cx="87" cy="64" r="2.2" fill="var(--gold)" /></>}
          <path d="M34 50 C34 22 86 22 86 50 L86 62 C86 78 74 86 60 86 C46 86 34 78 34 62 Z" fill={skin} />
          {v === 0 && <path d="M33 52 C33 20 87 20 87 52 L87 46 C82 32 38 32 33 46 Z" fill={hair} />}
          {v === 1 && <><path d="M32 54 C30 18 92 16 88 50 C82 36 72 42 60 36 C50 42 40 42 32 54 Z" fill={hair} /><path d="M86 48 C92 60 90 74 84 80 L84 56 Z" fill={hair} /></>}
          {v === 2 && <><path d="M33 48 C35 24 85 24 87 48 L87 40 C80 28 40 28 33 40 Z" fill={hair} /><circle cx="60" cy="22" r="10" fill={hair} /></>}
          {v === 3 && <><path d="M33 50 C33 20 87 20 87 50 L87 44 C82 32 38 32 33 44 Z" fill={hair} /><path d="M30 44 C34 26 86 26 90 44 L92 48 L28 48 Z" fill="#1f5244" /><path d="M28 48 L92 48 L96 54 L24 54 Z" fill="#163d33" /></>}
          {v === 1 && <g stroke="#1a1512" strokeWidth="1.8" fill="none" opacity="0.7"><circle cx="49" cy="57" r="8" /><circle cx="71" cy="57" r="8" /><path d="M57 57 L63 57" /></g>}
          <g className="char-pupils" style={{ transform: look }}>
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
