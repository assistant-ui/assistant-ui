import type { ReactNode } from "react";
import type { LibrarySectionId } from "@/lib/library/library-data";
import { cn } from "@/lib/utils";
import { GlyphMcpServers } from "./skill-glyphs";
import {
  ACCENT_FILL,
  ACCENT_STROKE,
  DIM,
  DOT,
  FAINT,
  GlyphAgent,
  GlyphSvg,
  SOLID,
  WindowChrome,
  motion,
} from "./starter-glyphs";

// One drawing per kind of library item, in the starters' 32 by 24 line style.

/** A grid of parts, one picked. */
function GlyphComponents() {
  const cells = [0, 1, 2, 3, 4, 5].map((index) => ({
    x: 4.5 + (index % 3) * 8.5,
    y: 4.5 + Math.floor(index / 3) * 8.5,
    index,
  }));
  return (
    <GlyphSvg>
      {cells.map(({ x, y, index }) => (
        <rect
          key={index}
          {...motion("pop", index * 50)}
          x={x}
          y={y}
          width="6.5"
          height="6.5"
          rx="1.6"
          className={index === 0 ? cn(SOLID, ACCENT_FILL) : DIM}
        />
      ))}
    </GlyphSvg>
  );
}

/** An app window with a sidebar and an assistant in its corner. */
function GlyphBlocks() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <path d="M11 7.5V20.5" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M5.5 11H8.5"
        className={DIM}
      />
      <path
        {...motion("draw", 70)}
        pathLength={100}
        d="M5.5 14H8.5"
        className={DIM}
      />
      <rect
        {...motion("pop", 180)}
        x="18"
        y="12"
        width="8.5"
        height="6"
        rx="1.4"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

/** Four small app windows. */
function GlyphStarters() {
  const windows: Array<[number, number]> = [
    [1.5, 2],
    [19, 2],
    [1.5, 16],
    [19, 16],
  ];
  return (
    <GlyphSvg>
      {windows.map(([x, y], index) => (
        <g key={index}>
          <rect x={x} y={y} width="11.5" height="8" rx="1.3" className={DIM} />
          <path d={`M${x} ${y + 2.6}H${x + 11.5}`} className={FAINT} />
          <path
            {...motion("draw", index * 90)}
            pathLength={100}
            d={`M${x + 2.3} ${y + 5.3}H${x + 8}`}
            className={index === 0 ? ACCENT_STROKE : DIM}
          />
        </g>
      ))}
    </GlyphSvg>
  );
}

/** The chat on one side, a backend on the other, and the line between them. */
function GlyphRuntimes() {
  return (
    <GlyphSvg>
      <rect x="3" y="7" width="8.5" height="10" rx="1.6" className={DIM} />
      <rect x="20.5" y="7" width="8.5" height="10" rx="1.6" className={DIM} />
      <path d="M5.5 10.5H9M5.5 13.5H8" className={FAINT} />
      <circle cx="24.75" cy="12" r="1.4" className={DOT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M12.5 12H19.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

/** Two services that overlap. */
function GlyphIntegrations() {
  return (
    <GlyphSvg>
      <circle
        {...motion("shift", 0, { "--glyph-dx": "-1.6px" })}
        cx="12.5"
        cy="12"
        r="6.5"
        className={DIM}
      />
      <circle
        {...motion("shift", 0, { "--glyph-dx": "1.6px" })}
        cx="19.5"
        cy="12"
        r="6.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

/** Three sliders. */
function GlyphUtilities() {
  const sliders: Array<[y: number, x: number, dx: string]> = [
    [6.5, 11, "3px"],
    [12, 21, "-4px"],
    [17.5, 14, "3px"],
  ];
  return (
    <GlyphSvg>
      {sliders.map(([y, x, dx], index) => (
        <g key={y}>
          <path d={`M4 ${y}H28`} className={FAINT} />
          <circle
            {...motion("shift", index * 60, { "--glyph-dx": dx })}
            cx={x}
            cy={y}
            r="2"
            className={cn("fill-background", index === 1 && ACCENT_STROKE)}
          />
        </g>
      ))}
    </GlyphSvg>
  );
}

/** A page of instructions, checked off. */
function GlyphSkills() {
  return (
    <GlyphSvg>
      <rect x="8" y="3" width="16" height="18" rx="2" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M11.5 7.5H20.5"
        className={DIM}
      />
      <path
        {...motion("draw", 80)}
        pathLength={100}
        d="M11.5 11H18"
        className={DIM}
      />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M11.5 16.200l1.900 1.800 3.600-3.800"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

/** Lines of text with a shine passing over them. */
function GlyphShimmer() {
  const lines = ["M4 7H28", "M4 12H22", "M4 17H25"];
  return (
    <GlyphSvg>
      {lines.map((d) => (
        <path
          key={d}
          d={d}
          className="stroke-foreground/12 [stroke-width:2.6]"
        />
      ))}
      {lines.map((d, index) => (
        <path
          key={`${d}-shine`}
          {...motion("blip", index * 140)}
          pathLength={100}
          d={d}
          className={cn(
            "stroke-foreground/60 [stroke-width:2.6]",
            index === 1 && ACCENT_STROKE,
          )}
        />
      ))}
    </GlyphSvg>
  );
}

/** A grid of days, some busier than others. */
function GlyphHeat() {
  const tones = [
    "fill-foreground/10",
    "fill-foreground/25",
    "fill-foreground/15",
    "fill-foreground/40",
    "fill-foreground/20",
    "fill-foreground/10",
    "fill-foreground/30",
  ];
  return (
    <GlyphSvg>
      {Array.from({ length: 28 }, (_, index) => (
        <rect
          key={index}
          {...motion("twinkle", ((index * 7) % 10) * 90)}
          x={2.5 + (index % 7) * 4}
          y={4.5 + Math.floor(index / 7) * 4}
          width="3"
          height="3"
          rx="0.6"
          className={cn(
            "stroke-none",
            tones[(index * 3) % tones.length],
            index === 10 && ACCENT_FILL,
          )}
        />
      ))}
    </GlyphSvg>
  );
}

/** A window holding a fenced-off frame. */
function GlyphFrame() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <rect
        {...motion("march")}
        x="7"
        y="10"
        width="18"
        height="7.5"
        rx="1"
        className="[stroke-dasharray:2_2]"
      />
      <rect
        {...motion("orbit")}
        x="14.5"
        y="12.5"
        width="3"
        height="2.5"
        rx="0.6"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

/** Spans on a timeline. */
function GlyphO11y() {
  return (
    <GlyphSvg>
      <path d="M3 3.5V20.5" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M5 6.5H28"
        className="stroke-foreground/30 [stroke-width:2.4]"
      />
      <path
        {...motion("draw", 110)}
        pathLength={100}
        d="M9 12H21"
        className="stroke-foreground/25 [stroke-width:2.4]"
      />
      <path
        {...motion("draw", 220)}
        pathLength={100}
        d="M14 17.5H25"
        className={cn("[stroke-width:2.4]", ACCENT_STROKE)}
      />
    </GlyphSvg>
  );
}

const UTILITY_GLYPHS: Record<string, () => ReactNode> = {
  shimmer: GlyphShimmer,
  heat: GlyphHeat,
  frame: GlyphFrame,
  o11y: GlyphO11y,
};

/** A utility's own drawing; one with none borrows the Utilities tab's. */
export function UtilityGlyph({ name }: { name: string }) {
  const Glyph = UTILITY_GLYPHS[name] ?? GlyphUtilities;
  return <Glyph />;
}

/** Books on a shelf, one pulled forward. */
export function GlyphLibrary() {
  return (
    <GlyphSvg>
      <path d="M3.5 20.5H28.5" className={FAINT} />
      <rect x="5.5" y="6" width="4" height="14.5" rx="1" className={DIM} />
      <rect x="11" y="9" width="4" height="11.500" rx="1" className={DIM} />
      <rect
        {...motion("pop", 120)}
        x="16.5"
        y="4.5"
        width="4"
        height="16"
        rx="1"
        className={cn(SOLID, ACCENT_FILL)}
      />
      <rect
        x="22.2"
        y="8"
        width="3.6"
        height="12.500"
        rx="1"
        transform="rotate(12 24 20.500)"
        className={DIM}
      />
    </GlyphSvg>
  );
}

/** Things a chat can do, each with a switch, the first turned on. */
function GlyphFeatures() {
  const rows = [5.5, 12, 18.5];
  return (
    <GlyphSvg>
      {rows.map((y, index) => (
        <g key={y}>
          <path
            {...motion("draw", index * 70)}
            pathLength={100}
            d={`M4 ${y}H${index === 1 ? 12.5 : 15.5}`}
            className={DIM}
          />
          <rect
            x="20"
            y={y - 2.5}
            width="8"
            height="5"
            rx="2.5"
            className={index === 0 ? cn(DIM, ACCENT_STROKE) : FAINT}
          />
          <circle
            cx={index === 0 ? 25.5 : 22.5}
            cy={y}
            r="1.25"
            className={index === 0 ? cn(SOLID, ACCENT_FILL) : DOT}
          />
        </g>
      ))}
    </GlyphSvg>
  );
}

const GLYPHS: Record<LibrarySectionId, () => ReactNode> = {
  components: GlyphComponents,
  features: GlyphFeatures,
  blocks: GlyphBlocks,
  starters: GlyphStarters,
  runtimes: GlyphRuntimes,
  integrations: GlyphIntegrations,
  utilities: GlyphUtilities,
  skills: GlyphSkills,
  agents: GlyphAgent,
  mcp: GlyphMcpServers,
};

export function LibraryGlyph({ id }: { id: LibrarySectionId }) {
  const Glyph = GLYPHS[id];
  return <Glyph />;
}
