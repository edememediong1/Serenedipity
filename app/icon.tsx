import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Favicon: the signature orb. Colours are the design-system gradient stops. */
export default function Icon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "transparent" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: 9999,
          background: "linear-gradient(135deg, #3F5EF5 0%, #7C4DFF 60%, #FF8A4C 100%)",
        }}
      />
    </div>,
    size,
  );
}
