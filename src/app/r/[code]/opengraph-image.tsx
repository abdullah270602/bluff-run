import { ImageResponse } from "next/og";
import { STAGES } from "@/game/run";
import { decodeRun, emptyStats } from "@/game/share";

export const alt = "Bluff Run result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const stats = decodeRun(code) ?? emptyStats();
  const stageNum = STAGES[Math.min(STAGES.length - 1, Math.max(0, stats.stageIdx))];

  const headline = stats.won
    ? "Cleared the 100."
    : stats.cleared === 0
      ? "Jev held the first table."
      : `Out at stage ${stats.stageIdx + 1}.`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          background: "linear-gradient(145deg, #06100d 0%, #10261f 60%, #173a31 100%)",
          color: "#f2eee3",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Brand Row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "#e3cf8e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0b1310",
                fontWeight: 800,
                fontSize: "20px",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 32 32" fill="#0b1310">
                <rect x="0" y="28" width="4" height="4" rx="1.1" />
                <rect x="5" y="22.5" width="6" height="6" rx="1.6" />
                <rect x="12" y="15" width="9" height="9" rx="2.3" />
                <rect x="19" y="4" width="13" height="13" rx="3.2" />
              </svg>
            </div>
            <span style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em" }}>
              Bluff Run
            </span>
          </div>
          <span
            style={{
              padding: "8px 20px",
              borderRadius: "999px",
              background: "rgba(215, 255, 63, 0.16)",
              color: "#e3cf8e",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            How far can you go against AI?
          </span>
        </div>

        {/* Middle Headline & Ladder Bars */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "48px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "560px" }}>
            <div style={{ fontSize: "72px", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.02 }}>
              {headline}
            </div>
            <div style={{ fontSize: "26px", color: "rgba(242, 238, 227, 0.72)" }}>
              {stats.beaten} AI opponents beaten over {stats.hands} hands
            </div>
          </div>

          {/* 8 Ladder Rungs */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", height: "220px" }}>
            {STAGES.map((n, i) => {
              const cleared = i < stats.cleared;
              const current = i === stats.stageIdx && !stats.won;
              const h = 44 + i * 24;
              return (
                <div
                  key={n}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      width: "46px",
                      height: `${h}px`,
                      borderRadius: "12px",
                      background: cleared
                        ? "#e3cf8e"
                        : current
                          ? "rgba(215, 255, 63, 0.22)"
                          : "rgba(242, 238, 227, 0.08)",
                      border: current ? "2px solid #e3cf8e" : "1px solid rgba(242, 238, 227, 0.14)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: cleared || current ? "#e3cf8e" : "rgba(242, 238, 227, 0.45)",
                    }}
                  >
                    {n}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Telemetry Strip */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            paddingTop: "24px",
            borderTop: "1px solid rgba(242, 238, 227, 0.15)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: "15px", color: "rgba(242, 238, 227, 0.5)" }}>
              Stages cleared
            </span>
            <span style={{ fontSize: "30px", fontWeight: 700 }}>{stats.cleared} / 8</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: "15px", color: "rgba(242, 238, 227, 0.5)" }}>
              Opponents beaten
            </span>
            <span style={{ fontSize: "30px", fontWeight: 700 }}>{stats.beaten}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <span style={{ fontSize: "15px", color: "rgba(242, 238, 227, 0.5)" }}>
              Biggest pot
            </span>
            <span style={{ fontSize: "30px", fontWeight: 700 }}>{stats.biggestPot.toLocaleString()}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1.4 }}>
            <span style={{ fontSize: "15px", color: "rgba(242, 238, 227, 0.5)" }}>
              Best hand
            </span>
            <span style={{ fontSize: "26px", fontWeight: 700 }}>{stats.bestHand || "No showdowns"}</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
