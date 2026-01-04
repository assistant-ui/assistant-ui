import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

const ZINC_950 = "#09090b";
const ZINC_400 = "#a1a1aa";

async function loadGeistFont(weight: "Regular" | "Bold") {
  // Per Next.js docs, `process.cwd()` is the Next.js project directory.
  return readFile(join(process.cwd(), `assets/fonts/Geist-${weight}.ttf`));
}

export async function generateOgImage(title: string, description?: string) {
  const [geistRegular, geistBold] = await Promise.all([
    loadGeistFont("Regular"),
    loadGeistFont("Bold"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        backgroundColor: ZINC_950,
        padding: "85px",
      }}
    >
      <svg width="150" height="150" viewBox="0 0 24 24" fill="white">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 1L21.526 6.5V17.5L12 23L2.474 17.5V6.5L12 1ZM12 7C9.239 7 7 9.239 7 12C7 14.761 9.239 17 12 17C14.761 17 17 14.761 17 12C17 9.239 14.761 7 12 7Z"
        />
      </svg>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "120px",
            fontFamily: "Geist Bold",
            fontWeight: 700,
            color: "white",
            marginBottom: "12px",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </div>

        {description && (
          <div
            style={{
              display: "flex",
              fontSize: "50px",
              fontFamily: "Geist Regular",
              fontWeight: 400,
              color: ZINC_400,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "Geist Regular",
          data: geistRegular,
          style: "normal",
          weight: 400,
        },
        {
          name: "Geist Bold",
          data: geistBold,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
}

export function createOgImageHandler(title: string, description?: string) {
  return async function Image() {
    return generateOgImage(title, description);
  };
}
