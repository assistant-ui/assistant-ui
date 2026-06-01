import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OG_SIZE, OgTemplate } from "@/lib/og-template";

export const alt = "tw-shimmer";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [geistRegular, geistMedium, geistMono, shimmerTextPng] =
    await Promise.all([
      readFile(join(process.cwd(), "assets/Geist-Regular.ttf")),
      readFile(join(process.cwd(), "assets/Geist-Medium.ttf")),
      readFile(join(process.cwd(), "assets/GeistMono-Regular.ttf")),
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
          fontFamily: "Geist",
          letterSpacing: "-0.01em",
          textAlign: "center",
        }}
      >
        Zero-dependency CSS-only shimmer
      </span>
    </OgTemplate>,
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          data: geistRegular,
          style: "normal",
          weight: 400,
        },
        {
          name: "Geist",
          data: geistMedium,
          style: "normal",
          weight: 500,
        },
        {
          name: "GeistMono",
          data: geistMono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
