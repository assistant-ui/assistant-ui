import { ImageResponse } from "next/og";
import type { ReactElement } from "react";
import type { ImageResponseOptions } from "next/server";
import { loadOgFonts, OG_FONT_MONO, OG_FONT_SANS } from "@/lib/og-fonts";
import { getRepo } from "@/lib/github";
import { FLAGSHIP_PACKAGE, getWeeklyDownloads } from "@/lib/npm";
import {
  PACKAGES,
  fetchContributors,
  fetchDownloadsTimeline,
  fetchStarHistory,
} from "@/lib/traction";
import type { TimelinePoint } from "@/lib/traction";
import { formatCompact } from "@/lib/format";

const WIDTH = 1200;
const HEIGHT = 590;
const PAGE_PAD = 56;
const COLUMN_GAP = 28;
const PLATE_PAD = 16;
const COLUMN_W = (WIDTH - PAGE_PAD * 2 - COLUMN_GAP) / 2;
const INNER_W = COLUMN_W - PLATE_PAD * 2 - 2;
const GUTTER = 44;
const PLOT_W = INNER_W - GUTTER;
const PLOT_H = 186;
const TICK_GAP = 8;
const TICK_LINE_H = 14;
// Yoga reads height as the border box. Spelling the body out keeps the frame
// tall enough for the tick row and identical across both plate branches.
const PLATE_H = PLOT_H + TICK_GAP + TICK_LINE_H + PLATE_PAD * 2 + 2;
const TICK_ROWS = 4;

// The site's tokens resolved out of oklch, which satori cannot parse.
const THEMES = {
  light: {
    paper: "#fcfcfb",
    ink: "#0a0a08",
    muted: "#74746f",
    rule: "#e5e5e2",
    data: "#f54900",
    wash: 0.28,
  },
  dark: {
    paper: "#0f0f0e",
    ink: "#fafaf9",
    muted: "#a1a19e",
    rule: "#272726",
    data: "#fd5c00",
    wash: 0.2,
  },
} as const;

type Theme = (typeof THEMES)[keyof typeof THEMES];

let fontsCache: Awaited<ReturnType<typeof loadOgFonts>> | null = null;

const monthYear = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    })
    .toLowerCase();

/** A round gridline step that clears `max` in TICK_ROWS - 1 jumps, headroom included. */
const niceCeiling = (max: number): number => {
  if (max <= 0) return 1;
  const raw = (max * 1.05) / (TICK_ROWS - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    ([1, 1.5, 2, 2.5, 3, 4, 5, 7.5].find((s) => raw <= s * magnitude) ?? 10) *
    magnitude;
  return step * (TICK_ROWS - 1);
};

function Stat({
  value,
  label,
  caption,
  fontSans,
  fontMono,
  theme,
}: {
  value: string;
  label: string;
  caption: string;
  fontSans: string;
  fontMono: string;
  theme: Theme;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span
        style={{
          fontSize: 46,
          fontWeight: 600,
          color: theme.ink,
          fontFamily: fontSans,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 17,
          color: theme.ink,
          fontFamily: fontSans,
          marginTop: 8,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12,
          color: theme.muted,
          fontFamily: fontMono,
          marginTop: 4,
        }}
      >
        {caption}
      </span>
    </div>
  );
}

function Plate({
  eyebrow,
  caption,
  points,
  gradientId,
  fontMono,
  theme,
}: {
  eyebrow: string;
  caption: string;
  points: TimelinePoint[];
  gradientId: string;
  fontMono: string;
  theme: Theme;
}) {
  const frame = {
    display: "flex",
    border: `1px solid ${theme.rule}`,
    padding: PLATE_PAD,
    height: PLATE_H,
  } as const;
  const shell = (body: ReactElement) => (
    <div style={{ display: "flex", flexDirection: "column", width: COLUMN_W }}>
      <span
        style={{
          fontSize: 11,
          fontFamily: fontMono,
          color: theme.muted,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </span>
      {body}
      <span
        style={{
          fontSize: 12,
          color: theme.muted,
          fontFamily: fontMono,
          marginTop: 12,
        }}
      >
        {caption}
      </span>
    </div>
  );

  // An empty series would otherwise draw an axis and no curve, which reads as a
  // chart of roughly zero next to a stat naming the real number.
  if (points.length < 2) {
    return shell(
      <div style={{ ...frame, alignItems: "center" }}>
        <span
          style={{ fontSize: 13, color: theme.muted, fontFamily: fontMono }}
        >
          currently unavailable
        </span>
      </div>,
    );
  }

  const ceiling = niceCeiling(Math.max(1, ...points.map((p) => p.value)));
  const xs = points.map((p) => new Date(p.date).getTime());
  const minX = Math.min(...xs);
  const spanX = Math.max(1, Math.max(...xs) - minX);
  const pts = points.map((point, i) => ({
    x: ((xs[i]! - minX) / spanX) * PLOT_W,
    y: PLOT_H - (point.value / ceiling) * PLOT_H,
  }));

  const line = pts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area = pts.length
    ? `${line} L ${pts[pts.length - 1]!.x.toFixed(1)} ${PLOT_H} L ${pts[0]!.x.toFixed(1)} ${PLOT_H} Z`
    : "";

  const yTicks = Array.from({ length: TICK_ROWS }, (_, i) =>
    formatCompact(
      Math.round((ceiling * (TICK_ROWS - 1 - i)) / (TICK_ROWS - 1)),
    ),
  );
  const xTicks = points.length
    ? [points[0]!, points[Math.floor(points.length / 2)]!, points.at(-1)!].map(
        (p) => monthYear(p.date),
      )
    : [];

  return shell(
    <div style={frame}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          justifyContent: "space-between",
          width: GUTTER - 10,
          height: PLOT_H + 13,
          marginTop: -7,
        }}
      >
        {yTicks.map((tick, i) => (
          <span
            key={i}
            style={{ fontSize: 11, color: theme.muted, fontFamily: fontMono }}
          >
            {tick}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 10 }}>
        <svg width={PLOT_W} height={PLOT_H} viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={theme.data}
                stopOpacity={theme.wash}
              />
              <stop offset="100%" stopColor={theme.data} stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((_, i) => (
            <line
              key={i}
              x1="0"
              x2={PLOT_W}
              y1={(PLOT_H * i) / (TICK_ROWS - 1)}
              y2={(PLOT_H * i) / (TICK_ROWS - 1)}
              stroke={theme.rule}
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}
          {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
          {line ? (
            <path
              d={line}
              fill="none"
              stroke={theme.data}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
        </svg>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: PLOT_W,
            marginTop: 8,
          }}
        >
          {xTicks.map((tick, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                color: theme.muted,
                fontFamily: fontMono,
              }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>
    </div>,
  );
}

export async function renderTractionImage(name: keyof typeof THEMES) {
  const theme = THEMES[name];

  const [repo, stars, downloads, weekly, contributors] = await Promise.all([
    getRepo(),
    fetchStarHistory(),
    fetchDownloadsTimeline(FLAGSHIP_PACKAGE),
    getWeeklyDownloads(),
    fetchContributors(),
  ]);

  let fonts: Awaited<ReturnType<typeof loadOgFonts>> | null = null;
  try {
    fontsCache ??= await loadOgFonts();
    fonts = fontsCache;
  } catch (error) {
    console.error("Failed to load fonts for the traction image:", error);
  }
  const fontSans = fonts ? OG_FONT_SANS : "sans-serif";
  const fontMono = fonts ? OG_FONT_MONO : "monospace";

  const imageOptions: ImageResponseOptions = {
    width: WIDTH,
    height: HEIGHT,
    headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600" },
  };
  if (fonts) {
    imageOptions.fonts = fonts;
  }

  const stats = [
    {
      value: repo ? formatCompact(repo.stars) : "—",
      label: "GitHub stars",
      caption: "and counting",
    },
    {
      value: weekly == null ? "—" : formatCompact(weekly),
      label: "Weekly downloads",
      caption: FLAGSHIP_PACKAGE,
    },
    {
      value: contributors ? String(contributors.length) : "—",
      label: "Contributors",
      caption: "from the community",
    },
    {
      value: String(PACKAGES.filter((pkg) => !pkg.deprecated).length),
      label: "Public packages",
      caption: "shipped on npm",
    },
  ];

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        backgroundColor: theme.paper,
        padding: PAGE_PAD,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {stats.map((stat) => (
          <Stat
            key={stat.label}
            {...stat}
            fontSans={fontSans}
            fontMono={fontMono}
            theme={theme}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          gap: COLUMN_GAP,
          marginTop: 34,
          paddingTop: 34,
          borderTop: `1px solid ${theme.rule}`,
        }}
      >
        <Plate
          eyebrow="GitHub stars"
          caption="fig. 01 · weekly, from the star history api"
          points={stars}
          gradientId="stars"
          fontMono={fontMono}
          theme={theme}
        />
        <Plate
          eyebrow="npm downloads"
          caption={`fig. 02 · monthly, ${FLAGSHIP_PACKAGE} on npm`}
          points={downloads}
          gradientId="downloads"
          fontMono={fontMono}
          theme={theme}
        />
      </div>
    </div>,
    imageOptions,
  );
}
