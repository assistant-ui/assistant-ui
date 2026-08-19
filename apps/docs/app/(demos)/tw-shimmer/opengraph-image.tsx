import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadOgFonts, OG_FONT_SANS } from "@/lib/og-fonts";
import { OG_SIZE, OgTemplate } from "@/lib/og-template";

export const alt = "tw-shimmer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [fonts, shimmerTextPng] = await Promise.all([
    loadOgFonts(),
    readFile(join(process.cwd(), "assets/tw-shimmer-text.png"), "base64"),
  ]);

  const shimmerTextSrc = `data:image/png;base64,${shimmerTextPng}`;

  return new ImageResponse(
    <OgTemplate subtleBranding>
      <img
        src={shimmerTextSrc}
        alt="tw-shimmer"
        height={100}
        style={{ objectFit: "contain", marginBottom: 20 }}
      />
      <span
        style={{
          fontSize: 42,
          fontWeight: 400,
          color: "#a3a3a3",
          fontFamily: OG_FONT_SANS,
          letterSpacing: "-0.01em",
          textAlign: "center",
        }}
      >
        Zero-dependency CSS-only shimmer
      </span>
    </OgTemplate>,
    {
      ...size,
      fonts,
    },
  );
}
