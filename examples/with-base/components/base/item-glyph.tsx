import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import "./item-glyph.css";

/*
 * A small line drawing for each place in the app, in a bordered tile. One
 * part of every drawing takes the brand color, and the drawing plays its
 * motion, while the nearest element with the `group/glyph` class and the
 * `data-item-glyph-host` attribute is hovered or has the keyboard focus
 * inside it. The tile is such an element itself; put both on a card to have
 * the whole card set it off.
 */

const ACCENT_STROKE =
  "transition-colors duration-200 group-hover/glyph:stroke-brand group-has-focus-visible/glyph:stroke-brand";
const ACCENT_FILL =
  "transition-colors duration-200 group-hover/glyph:fill-brand group-has-focus-visible/glyph:fill-brand";
const FAINT = "stroke-foreground/15";
const DIM = "stroke-foreground/25";

type GlyphMotion = "draw" | "pop" | "shift" | "bob" | "drop" | "settle";

function motion(
  kind: GlyphMotion,
  delay = 0,
  vars: Record<`--glyph-${string}`, string> = {},
) {
  return {
    "data-glyph-motion": kind,
    style: { "--glyph-delay": `${delay}ms`, ...vars } as CSSProperties,
  };
}

function GlyphSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 24"
      aria-hidden
      className="stroke-foreground/40 h-[1.125rem] w-6 overflow-visible fill-none [stroke-width:1.25] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      {children}
    </svg>
  );
}

function WindowChrome() {
  return (
    <>
      <rect x="3" y="3.5" width="26" height="17" rx="2" className={DIM} />
      <path d="M3 7.5H29" className={FAINT} />
      <circle
        cx="5.6"
        cy="5.5"
        r="0.75"
        className="fill-foreground/30 stroke-none"
      />
      <circle
        cx="7.9"
        cy="5.5"
        r="0.75"
        className="fill-foreground/30 stroke-none"
      />
    </>
  );
}

function GlyphChat() {
  const dots = [11.5, 16, 20.5];
  return (
    <GlyphSvg>
      <path
        d="M8 4.5H24A3 3 0 0 1 27 7.5V13.5A3 3 0 0 1 24 16.5H13L8.5 20V16.5H8A3 3 0 0 1 5 13.5V7.5A3 3 0 0 1 8 4.5Z"
        className={DIM}
      />
      {dots.map((cx, index) => (
        <circle
          key={cx}
          {...motion("bob", index * 120)}
          cx={cx}
          cy="10.5"
          r="1.1"
          className={cn(
            "fill-foreground/35 stroke-none",
            index === 2 && ACCENT_FILL,
          )}
        />
      ))}
    </GlyphSvg>
  );
}

function GlyphProjects() {
  return (
    <GlyphSvg>
      <path
        d="M4 6.5A1.5 1.5 0 0 1 5.5 5H12.4L15 8H26.5A1.5 1.5 0 0 1 28 9.5V18A1.5 1.5 0 0 1 26.5 19.5H5.5A1.5 1.5 0 0 1 4 18Z"
        className={DIM}
      />
      <path {...motion("draw")} pathLength={100} d="M8 12.5H19" />
      <path
        {...motion("draw", 110)}
        pathLength={100}
        d="M8 15.5H14.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphImages() {
  return (
    <GlyphSvg>
      <rect x="4" y="4" width="24" height="16" rx="2" className={DIM} />
      <circle
        {...motion("pop")}
        cx="10.5"
        cy="9.5"
        r="2"
        className={cn("fill-foreground/35 stroke-none", ACCENT_FILL)}
      />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M4.5 17.5L11.5 12.5L16 16L20.5 11L27.5 17"
      />
    </GlyphSvg>
  );
}

function GlyphHealth() {
  return (
    <GlyphSvg>
      <path
        d="M16 19.5C9.5 15.3 6.5 12 6.5 8.9A4.4 4.4 0 0 1 16 7.4A4.4 4.4 0 0 1 25.5 8.9C25.5 12 22.5 15.3 16 19.5Z"
        className={DIM}
      />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M2 12.5H11.5L13.5 9L16 16L18.5 11L19.8 12.5H30"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphFinances() {
  const bars = [
    { x: 6, y: 13, height: 7 },
    { x: 14, y: 9, height: 11 },
    { x: 22, y: 5, height: 15 },
  ];
  return (
    <GlyphSvg>
      <path d="M3 20H29" className={FAINT} />
      {bars.map((bar, index) => (
        <rect
          key={bar.x}
          {...motion("pop", index * 90)}
          x={bar.x}
          y={bar.y}
          width="4"
          height={bar.height}
          rx="1"
          className={
            index === 2
              ? cn("fill-foreground/35 stroke-none", ACCENT_FILL)
              : DIM
          }
        />
      ))}
    </GlyphSvg>
  );
}

function GlyphSites() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <rect
        {...motion("pop")}
        x="6"
        y="10"
        width="20"
        height="4"
        rx="1"
        className={cn("fill-foreground/20 stroke-none", ACCENT_FILL)}
      />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M6 17H13"
        className={DIM}
      />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M16 17H26"
        className={DIM}
      />
    </GlyphSvg>
  );
}

function GlyphMaps() {
  return (
    <GlyphSvg>
      <path
        d="M4 6.5L11.5 4L20.5 6.5L28 4V17.5L20.5 20L11.5 17.5L4 20Z"
        className={DIM}
      />
      <path d="M11.5 4V17.5M20.5 6.5V20" className={FAINT} />
      <g {...motion("drop")}>
        <path
          d="M16 16C13.3 13.2 12.3 11.6 12.3 10A3.7 3.7 0 0 1 19.7 10C19.7 11.6 18.7 13.2 16 16Z"
          className={cn("fill-background", ACCENT_STROKE)}
        />
        <circle
          cx="16"
          cy="10"
          r="1"
          className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
        />
      </g>
    </GlyphSvg>
  );
}

function GlyphCodeReview() {
  return (
    <GlyphSvg>
      <path
        {...motion("draw")}
        pathLength={100}
        d="M4 6.5H15"
        className={DIM}
      />
      <path
        {...motion("draw", 80)}
        pathLength={100}
        d="M4 11.5H11.5"
        className={DIM}
      />
      <path
        {...motion("draw", 160)}
        pathLength={100}
        d="M4 16.5H13"
        className={DIM}
      />
      <circle cx="22.5" cy="13.5" r="5.5" />
      <path
        {...motion("draw", 260)}
        pathLength={100}
        d="M19.9 13.6L21.8 15.5L25.2 11.7"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphSpaces() {
  return (
    <GlyphSvg>
      <path
        {...motion("settle", 300)}
        d="M5 16L16 21L27 16"
        className={FAINT}
      />
      <path
        {...motion("settle", 250)}
        d="M5 12.5L16 17.5L27 12.5"
        className={DIM}
      />
      <path
        {...motion("drop")}
        d="M16 4L27 9L16 14L5 9Z"
        className={cn("fill-foreground/10", ACCENT_FILL, ACCENT_STROKE)}
      />
    </GlyphSvg>
  );
}

function GlyphScheduled() {
  return (
    <GlyphSvg>
      <circle
        {...motion("draw")}
        pathLength={100}
        cx="16"
        cy="12"
        r="8.5"
        className={DIM}
      />
      <path
        d="M16 5.2V6.4M22.8 12H21.6M16 18.8V17.6M9.2 12H10.4"
        className={FAINT}
      />
      <path {...motion("pop", 200)} d="M16 12V7.8" />
      <path {...motion("pop", 280)} d="M16 12H19.4" className={ACCENT_STROKE} />
    </GlyphSvg>
  );
}

function GlyphPlugins() {
  return (
    <GlyphSvg>
      <path
        {...motion("shift", 0, { "--glyph-dx": "0px", "--glyph-dy": "-1.5px" })}
        d="M13.5 9V5M18.5 9V5"
      />
      <rect x="10.5" y="9" width="11" height="6" rx="1.5" className={DIM} />
      <path
        {...motion("draw", 150)}
        pathLength={100}
        d="M16 15V17.5C16 19.4 17.6 20 19.5 20H29"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphArtifacts() {
  return (
    <GlyphSvg>
      <rect x="6" y="3.5" width="20" height="17" rx="3" className={DIM} />
      <path
        {...motion("shift", 0, { "--glyph-dx": "-1.5px", "--glyph-dy": "0px" })}
        d="M13 9.5L10.5 12L13 14.5"
      />
      <path
        {...motion("shift", 0, { "--glyph-dx": "1.5px", "--glyph-dy": "0px" })}
        d="M19 9.5L21.5 12L19 14.5"
      />
      <path
        {...motion("draw", 150)}
        pathLength={100}
        d="M17.2 8.5L14.8 15.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphApps() {
  const tiles: Array<[number, number]> = [
    [7.5, 3],
    [17, 3],
    [7.5, 12.5],
    [17, 12.5],
  ];
  return (
    <GlyphSvg>
      {tiles.map(([x, y], index) => (
        <rect
          key={index}
          {...motion("pop", index * 60)}
          x={x}
          y={y}
          width="7.5"
          height="7.5"
          rx="2"
          className={
            index === 1
              ? cn("fill-foreground/35 stroke-none", ACCENT_FILL)
              : DIM
          }
        />
      ))}
    </GlyphSvg>
  );
}

function GlyphComponents() {
  const diamonds: Array<[number, number, string, string]> = [
    [16, 6.5, "0px", "-1.5px"],
    [9.5, 12, "-1.5px", "0px"],
    [22.5, 12, "1.5px", "0px"],
    [16, 17.5, "0px", "1.5px"],
  ];
  return (
    <GlyphSvg>
      {diamonds.map(([cx, cy, dx, dy], index) => (
        <path
          key={index}
          {...motion("shift", 0, { "--glyph-dx": dx, "--glyph-dy": dy })}
          d={`M${cx} ${cy - 3.5}L${cx + 3.5} ${cy}L${cx} ${cy + 3.5}L${cx - 3.5} ${cy}Z`}
          className={index === 0 ? ACCENT_STROKE : DIM}
        />
      ))}
    </GlyphSvg>
  );
}

const GLYPHS = {
  chat: GlyphChat,
  projects: GlyphProjects,
  images: GlyphImages,
  health: GlyphHealth,
  finances: GlyphFinances,
  sites: GlyphSites,
  maps: GlyphMaps,
  "code-review": GlyphCodeReview,
  spaces: GlyphSpaces,
  scheduled: GlyphScheduled,
  plugins: GlyphPlugins,
  artifacts: GlyphArtifacts,
  apps: GlyphApps,
  components: GlyphComponents,
} satisfies Record<string, () => ReactNode>;

export type ItemGlyphKind = keyof typeof GLYPHS;

export function ItemGlyph({
  kind,
  className,
}: {
  kind: ItemGlyphKind;
  className?: string;
}) {
  const Glyph = GLYPHS[kind];

  return (
    <span
      data-item-glyph-host=""
      className={cn(
        "group/glyph border-foreground/10 bg-background grid size-9 shrink-0 place-items-center rounded-lg border",
        className,
      )}
    >
      <Glyph />
    </span>
  );
}
