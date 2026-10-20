import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#06100d",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="42" height="42" viewBox="0 0 32 32" fill="#d7ff3f">
          <rect x="0" y="28" width="4" height="4" rx="1.1" />
          <rect x="5" y="22.5" width="6" height="6" rx="1.6" />
          <rect x="12" y="15" width="9" height="9" rx="2.3" />
          <rect x="19" y="4" width="13" height="13" rx="3.2" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
