import { ImageResponse } from "next/og";
import { loadOgFonts, OG_FONT_SANS } from "@/lib/og-fonts";
import { OG_SIZE, OgTemplate } from "@/lib/og-template";

export const alt = "Safe Content Frame";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const fonts = await loadOgFonts();

  return new ImageResponse(
    <OgTemplate subtleBranding>
      <span
        style={{
          fontSize: 90,
          fontWeight: 600,
          color: "#ffffff",
          textAlign: "center",
          fontFamily: OG_FONT_SANS,
          letterSpacing: "-0.02em",
        }}
      >
        Safe Content Frame
      </span>
      <span
        style={{
          fontSize: 38,
          fontWeight: 400,
          color: "#a3a3a3",
          fontFamily: OG_FONT_SANS,
          letterSpacing: "-0.01em",
          textAlign: "left",
        }}
      >
        Render untrusted HTML securely in sandboxed iframes
      </span>
    </OgTemplate>,
    {
      ...size,
      fonts,
    },
  );
}
