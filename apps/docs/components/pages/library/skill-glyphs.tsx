import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  ACCENT_FILL,
  ACCENT_STROKE,
  DIM,
  DOT,
  FAINT,
  GlyphCloud,
  GlyphInk,
  GlyphLayers,
  GlyphNative,
  GlyphPointer,
  GlyphStream,
  GlyphSvg,
  GlyphThreadList,
  SOLID,
  motion,
} from "./starter-glyphs";

// A skill about something a starter already draws (the cloud, a terminal, a
// phone) shares that starter's glyph; the rest are drawn here in the same
// 32 by 24 line style.

/** A prompt that leaves a file tree behind. */
function GlyphSetup() {
  return (
    <GlyphSvg>
      <path d="M4.5 8.5L8 12L4.5 15.5" />
      <path d="M10 15.5H14" className={DIM} />
      <path d="M19.5 5V19" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M19.5 7.5H27"
        className={DIM}
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M19.5 12H24.5"
        className={DIM}
      />
      <path
        {...motion("draw", 180)}
        pathLength={100}
        d="M19.5 16.5H27.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

/** One version lifting off the last. */
function GlyphUpdate() {
  return (
    <GlyphSvg>
      <path d="M9 20H23" className={FAINT} />
      <path
        {...motion("settle", 100)}
        d="M10.5 16L16 10.5L21.5 16"
        className={DIM}
      />
      <g {...motion("rise")}>
        <path d="M10.5 10.5L16 5L21.5 10.5" className={ACCENT_STROKE} />
      </g>
    </GlyphSvg>
  );
}

/** A finished card: a label, a line, and its button. */
function GlyphElements() {
  return (
    <GlyphSvg>
      <rect x="5" y="3.5" width="22" height="17" rx="2.5" className={DIM} />
      <rect
        {...motion("pop")}
        x="8"
        y="6.5"
        width="8"
        height="3"
        rx="1.5"
        className="fill-foreground/15 stroke-none"
      />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M8 13H21"
        className={DIM}
      />
      <rect
        {...motion("pop", 260)}
        x="18"
        y="15.3"
        width="6"
        height="2.8"
        rx="1.4"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

/** A root outline holding the bare parts you compose. */
function GlyphPrimitives() {
  return (
    <GlyphSvg>
      <rect
        {...motion("march")}
        x="4"
        y="4"
        width="24"
        height="16"
        rx="2"
        className="[stroke-dasharray:2_2]"
      />
      <rect x="7.5" y="7.5" width="8" height="4" rx="1" className={DIM} />
      <circle
        {...motion("pop", 120)}
        cx="22"
        cy="9.5"
        r="2"
        className={ACCENT_STROKE}
      />
      <rect x="7.5" y="14" width="17" height="3" rx="1.5" className={DIM} />
    </GlyphSvg>
  );
}

/** Three tiles falling into a layout. */
function GlyphGenerative() {
  return (
    <GlyphSvg>
      <rect
        {...motion("pop")}
        x="4.5"
        y="4"
        width="11"
        height="16"
        rx="1.6"
        className={DIM}
      />
      <path d="M7 8H12M7 11H10.5" className={FAINT} />
      <rect
        {...motion("pop", 120)}
        x="17.5"
        y="4"
        width="10"
        height="7"
        rx="1.6"
        className={DIM}
      />
      <rect
        {...motion("pop", 240)}
        x="17.5"
        y="13"
        width="10"
        height="7"
        rx="1.6"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

/** A heading mark, two lines of text, and a code fence. */
function GlyphMarkdown() {
  return (
    <GlyphSvg>
      <path d="M5.5 7.5H12M5.5 11H12M7.8 5.3L7.2 13.2M10.3 5.3L9.7 13.2" />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M15.5 7.5H27"
        className={DIM}
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M15.5 11H23.5"
        className={DIM}
      />
      <rect x="5" y="15.5" width="22" height="5" rx="1.2" className={FAINT} />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M7.5 18H14"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

/** The core every surface reads from. */
function GlyphRuntime() {
  return (
    <GlyphSvg>
      <path
        {...motion("draw")}
        pathLength={100}
        d="M12.5 12H6.5"
        className={DIM}
      />
      <path
        {...motion("draw", 80)}
        pathLength={100}
        d="M19.5 12H25.5"
        className={DIM}
      />
      <path
        {...motion("draw", 160)}
        pathLength={100}
        d="M16 8.5V5"
        className={DIM}
      />
      <path
        {...motion("draw", 240)}
        pathLength={100}
        d="M16 15.5V19"
        className={DIM}
      />
      <circle cx="5" cy="12" r="1.5" className="fill-background" />
      <circle cx="27" cy="12" r="1.5" className="fill-background" />
      <circle cx="16" cy="3.5" r="1.5" className="fill-background" />
      <circle cx="16" cy="20.5" r="1.5" className="fill-background" />
      <rect
        x="12.5"
        y="8.5"
        width="7"
        height="7"
        rx="1.6"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

/** A call goes in, is approved, and a result comes out. */
function GlyphTools() {
  return (
    <GlyphSvg>
      <path d="M3.5 12H8.5" className={DIM} />
      <rect x="10" y="6" width="12" height="12" rx="2.2" />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M13.4 12.3L15.3 14.2L18.7 10.2"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M23.5 12H28.5M26.5 10L28.5 12L26.5 14"
        className={DIM}
      />
    </GlyphSvg>
  );
}

/** Two servers behind a switch the user flips. */
export function GlyphMcpServers() {
  return (
    <GlyphSvg>
      <rect x="3.5" y="4.5" width="10" height="6" rx="1.3" className={DIM} />
      <rect x="3.5" y="13.5" width="10" height="6" rx="1.3" className={DIM} />
      <circle cx="6" cy="7.5" r="0.75" className={DOT} />
      <circle cx="6" cy="16.5" r="0.75" className={DOT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M13.5 7.5H16.5V16.5H13.5"
        className={FAINT}
      />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M16.5 12H19.5"
        className={DIM}
      />
      <rect x="19.5" y="9" width="9" height="6" rx="3" className={DIM} />
      <circle
        {...motion("shift", 200, { "--glyph-dx": "-3px" })}
        cx="25.5"
        cy="12"
        r="1.7"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

/** A trace: spans stepping down a timeline. */
function GlyphTrace() {
  const spans = [
    [5, 6, 14],
    [9, 10, 20],
    [13, 14, 22],
    [17, 18, 27],
  ] as const;
  return (
    <GlyphSvg>
      <path d="M5 3.5V20.5" className={FAINT} />
      {spans.map(([from, y, to], index) => (
        <path
          key={y}
          {...motion("draw", index * 90)}
          pathLength={100}
          d={`M${from} ${y}H${to}`}
          className={cn(
            "[stroke-width:1.6]",
            index === 1 ? ACCENT_STROKE : DIM,
          )}
        />
      ))}
    </GlyphSvg>
  );
}

const SKILL_GLYPHS: Record<string, () => ReactNode> = {
  "assistant-ui": GlyphLayers,
  setup: GlyphSetup,
  update: GlyphUpdate,
  elements: GlyphElements,
  primitives: GlyphPrimitives,
  "generative-ui": GlyphGenerative,
  "thread-list": GlyphThreadList,
  markdown: GlyphMarkdown,
  runtime: GlyphRuntime,
  tools: GlyphTools,
  streaming: GlyphStream,
  cloud: GlyphCloud,
  copilots: GlyphPointer,
  "react-mcp": GlyphMcpServers,
  observability: GlyphTrace,
  "react-native": GlyphNative,
  ink: GlyphInk,
};

export function SkillGlyph({ name }: { name: string }) {
  const Glyph = SKILL_GLYPHS[name] ?? GlyphLayers;
  return <Glyph />;
}
