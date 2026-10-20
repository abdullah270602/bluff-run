import { ImageResponse } from "next/og";
import { STAGES } from "@/game/run";
import { decodeRun, emptyStats } from "@/game/share";

export const alt = "Bluff Run result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const IVORY = "#f4f1e8", GOLD = "#e3cf8e", DIM = "rgba(244, 241, 232, 0.55)", LINE = "rgba(244, 241, 232, 0.12)";

/** The result card: stage, the ladder, Jevs outlasted, and the vote that ended it. */
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const s = decodeRun(code) ?? emptyStats("", 0);
  const head = s.daily ? `Bluff Run #${s.daily}` : `Bluff Run, council ${s.seed}`;
  const title = s.won ? "Beat all 100 Jevs" : `Out at stage ${s.stageIdx + 1}`;
  const bust = s.bust ? [["Fold", s.bust.fold], ["Call", s.bust.call], ["Raise", s.bust.raise]] as [string, number][] : null;
  const total = bust ? bust.reduce((t, [, n]) => t + n, 0) : 0;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "52px 64px", background: "linear-gradient(145deg, #08120f 0%, #10261f 55%, #173a31 100%)", color: IVORY, fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 28, fontWeight: 700 }}>
            <svg width="30" height="30" viewBox="0 0 32 32" fill={GOLD}><rect x="0" y="28" width="4" height="4" rx="1.1" /><rect x="5" y="22.5" width="6" height="6" rx="1.6" /><rect x="12" y="15" width="9" height="9" rx="2.3" /><rect x="19" y="4" width="13" height="13" rx="3.2" /></svg>
            {head}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {STAGES.map((n, i) => (
              <div key={n} style={{ width: 54, height: 34, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, background: i < s.cleared ? IVORY : i === s.stageIdx && !s.won ? "rgba(255,84,104,0.18)" : "rgba(244,241,232,0.06)", color: i < s.cleared ? "#0b1310" : i === s.stageIdx && !s.won ? "#ff5468" : DIM, border: i === s.stageIdx && !s.won ? "2px solid #ff5468" : "2px solid transparent" }}>×{n}</div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontSize: 92, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>{title}</div>
            <div style={{ fontSize: 32, color: DIM }}>{s.beaten} Jevs outlasted over {s.hands} hands</div>
          </div>
          {bust && total > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: 400 }}>
              <div style={{ fontSize: 20, color: DIM }}>The vote that ended it</div>
              {bust.map(([label, n]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22 }}>
                  <div style={{ width: 70, color: DIM }}>{label}</div>
                  <div style={{ flex: 1, height: 14, borderRadius: 7, background: "rgba(244,241,232,0.08)", display: "flex" }}>
                    <div style={{ width: `${(n / total) * 100}%`, height: 14, borderRadius: 7, background: n === Math.max(...bust.map((b) => b[1])) ? GOLD : "rgba(244,241,232,0.35)" }} />
                  </div>
                  <div style={{ width: 40, textAlign: "right", fontWeight: 700 }}>{n}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 22, borderTop: `1px solid ${LINE}`, fontSize: 22, color: DIM }}>
          <span>Heads-up poker against a council of AI players that vote on every move.</span>
          <span style={{ color: GOLD }}>Same council, your turn.</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
