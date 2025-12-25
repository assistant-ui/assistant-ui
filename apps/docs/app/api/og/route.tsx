import { ImageResponse } from "next/og";
import { type NextRequest } from "next/server";
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";

export const runtime = "nodejs";

const size = {
  width: 1200,
  height: 630,
};

let fontsCache: {
  geistSemiBold: Buffer;
  geistRegular: Buffer;
  geistMedium: Buffer;
  geistMono: Buffer;
} | null = null;

const require = createRequire(import.meta.url);

async function loadFonts() {
  if (fontsCache) return fontsCache;

  const geistPath = dirname(require.resolve("geist/package.json"));
  const fontPath = join(geistPath, "dist/fonts");

  const [geistSemiBold, geistRegular, geistMedium, geistMono] =
    await Promise.all([
      readFile(join(fontPath, "geist-sans/Geist-SemiBold.ttf")),
      readFile(join(fontPath, "geist-sans/Geist-Regular.ttf")),
      readFile(join(fontPath, "geist-sans/Geist-Medium.ttf")),
      readFile(join(fontPath, "geist-mono/GeistMono-Regular.ttf")),
    ]);

  fontsCache = { geistSemiBold, geistRegular, geistMedium, geistMono };
  return fontsCache;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = (searchParams.get("title") ?? "Documentation").slice(0, 100);
  const description = searchParams.get("description")?.slice(0, 200) ?? null;
  const variant = searchParams.get("variant");

  if (variant && !["home", "page"].includes(variant)) {
    return new Response("Invalid variant", { status: 400 });
  }

  let fonts: Awaited<ReturnType<typeof loadFonts>>;
  try {
    fonts = await loadFonts();
  } catch (error) {
    console.error("Failed to load fonts for OG image:", error);
    return new Response("Failed to load fonts", { status: 500 });
  }

  const homeContent = (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        padding: "80px",
        gap: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="6" fill="#000000" />
          <g
            transform="translate(4,4)"
            fill="black"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
            <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
          </g>
        </svg>
        <span
          style={{
            fontSize: 100,
            fontWeight: 600,
            color: "#ffffff",
            fontFamily: "Geist",
            letterSpacing: "-0.02em",
          }}
        >
          assistant-ui
        </span>
      </div>
      <span
        style={{
          fontSize: 48,
          fontWeight: 400,
          color: "#a3a3a3",
          fontFamily: "Geist",
          letterSpacing: "-0.01em",
        }}
      >
        The UX of ChatGPT in your own app
      </span>
    </div>
  );

  const pageContent = (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0a",
        padding: "70px 80px 140px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill="#000000" />
            <g
              transform="translate(4,4)"
              fill="black"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
              <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
            </g>
          </svg>
          <span
            style={{
              fontSize: 44,
              fontWeight: 500,
              color: "#e5e5e5",
              fontFamily: "Geist",
              letterSpacing: "-0.01em",
            }}
          >
            assistant-ui
          </span>
        </div>
        <span
          style={{
            fontSize: 32,
            fontWeight: 400,
            color: "#a3a3a3",
            fontFamily: "GeistMono",
          }}
        >
          assistant-ui.com
        </span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          gap: 24,
        }}
      >
        <span
          style={{
            fontSize: title.length > 50 ? 56 : title.length > 30 ? 68 : 80,
            fontWeight: 600,
            color: "#ffffff",
            fontFamily: "Geist",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </span>
        {description && (
          <span
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: "#a3a3a3",
              fontFamily: "Geist",
              lineHeight: 1.4,
              letterSpacing: "-0.01em",
            }}
          >
            {description.length > 90
              ? description.slice(0, 90) + "..."
              : description}
          </span>
        )}
      </div>
    </div>
  );

  try {
    return new ImageResponse(variant === "home" ? homeContent : pageContent, {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      fonts: [
        {
          name: "Geist",
          data: fonts.geistSemiBold,
          style: "normal",
          weight: 600,
        },
        {
          name: "Geist",
          data: fonts.geistRegular,
          style: "normal",
          weight: 400,
        },
        {
          name: "Geist",
          data: fonts.geistMedium,
          style: "normal",
          weight: 500,
        },
        {
          name: "GeistMono",
          data: fonts.geistMono,
          style: "normal",
          weight: 400,
        },
      ],
    });
  } catch (error) {
    console.error("Failed to generate OG image:", error);
    return new Response("Failed to generate image", { status: 500 });
  }
}
