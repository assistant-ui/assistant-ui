import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OG_SIZE, OgTemplate } from "@/lib/og-template";

export const alt = "Safe Content Frame";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const [geistSemiBold, geistRegular, geistMedium, geistMono] =
    await Promise.all([
      readFile(join(process.cwd(), "assets/Geist-SemiBold.ttf")),
      readFile(join(process.cwd(), "assets/Geist-Regular.ttf")),
      readFile(join(process.cwd(), "assets/Geist-Medium.ttf")),
      readFile(join(process.cwd(), "assets/GeistMono-Regular.ttf")),
    ]);

  return new ImageResponse(
    <OgTemplate subtleBranding>
      <span
        style={{
          fontSize: 90,
          fontWeight: 600,
          color: "#ffffff",
          textAlign: "center",
          fontFamily: "Geist",
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
          fontFamily: "Geist",
          letterSpacing: "-0.01em",
          textAlign: "left",
        }}
      >
        Render untrusted HTML securely in sandboxed iframes
      </span>
    </OgTemplate>,
    {
      ...size,
      fonts: [
        {
          name: "Geist",
          data: geistSemiBold,
          style: "normal",
          weight: 600,
        },
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
