import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0B0D1A",
      }}
    >
      <div
        style={{
          width: 120,
          height: 120,
          borderRadius: 9999,
          background: "linear-gradient(135deg, #3F5EF5 0%, #7C4DFF 60%, #FF8A4C 100%)",
        }}
      />
    </div>,
    size,
  );
}
