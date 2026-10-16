import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";

export const alt = `${APP_NAME}: ${APP_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Open Graph image: midnight with the background glow, orb mark and tagline. */
export default async function OpengraphImage() {
  const fontDir = join(process.cwd(), "assets/fonts");
  const [serif, serifItalic] = await Promise.all([
    readFile(join(fontDir, "InstrumentSerif-Regular.ttf")),
    readFile(join(fontDir, "InstrumentSerif-Italic.ttf")),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        color: "#F4F2FF",
        background:
          "radial-gradient(circle at 88% 6%, rgba(124,77,255,0.60) 0, rgba(124,77,255,0) 52%), radial-gradient(circle at 6% 22%, rgba(63,94,245,0.42) 0, rgba(63,94,245,0) 46%), radial-gradient(circle at 12% 104%, rgba(255,138,76,0.38) 0, rgba(255,138,76,0) 48%), #0B0D1A",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 9999,
            background: "linear-gradient(135deg, #3F5EF5 0%, #7C4DFF 60%, #FF8A4C 100%)",
          }}
        />
        <div style={{ fontSize: 44, fontFamily: "Instrument Serif" }}>{APP_NAME}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            display: "flex",
            fontSize: 112,
            lineHeight: 1.02,
            fontFamily: "Instrument Serif",
            letterSpacing: -2,
          }}
        >
          Clear head. Deep&nbsp;<span style={{ fontStyle: "italic" }}>work</span>.
        </div>
        <div style={{ fontSize: 32, color: "#B4B2CC" }}>Focus music, a plan for your day, and company.</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Instrument Serif", data: serif, style: "normal", weight: 400 },
        { name: "Instrument Serif", data: serifItalic, style: "italic", weight: 400 },
      ],
    },
  );
}
