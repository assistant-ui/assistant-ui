import type { ReactNode } from "react";
import {
  ACCENT_FILL,
  ACCENT_STROKE,
  DIM,
  FAINT,
  GlyphCloud,
  GlyphElements,
  GlyphFrame,
  GlyphHeat,
  GlyphInk,
  GlyphNative,
  GlyphO11y,
  GlyphShimmer,
  GlyphSvg,
  GlyphVue,
  WindowChrome,
  motion,
} from "@/components/library/glyph";
import type { LibraryItem } from "@/lib/library/catalog";
import { cn } from "@/lib/utils";
import { LibraryGlyph } from "./library-glyph";

/*
 * A glyph of its own for each item that has no brand mark, in the grammar of
 * the header's: a 32 by 24 line drawing with one accented part, which moves
 * when its card is hovered. Where the header already draws the thing (Cloud,
 * Expo, Ink, the utilities), the item uses the header's glyph.
 */

const SOLID = "fill-foreground/35 stroke-none";
const DOT = "fill-foreground/30 stroke-none";

/* ------------------------------------------------------------ templates ---- */

function GlyphThread() {
  return (
    <GlyphSvg>
      <rect
        {...motion("pop")}
        x="16"
        y="3.5"
        width="11.5"
        height="4.5"
        rx="2.2"
        className="fill-foreground/15 stroke-none"
      />
      <path {...motion("draw", 120)} pathLength={100} d="M4.5 11.5H19" />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M4.5 14.5H14.5"
        className={DIM}
      />
      <rect x="4" y="17.5" width="24" height="4" rx="2" className={DIM} />
      <circle
        {...motion("pop", 320)}
        cx="25.6"
        cy="19.5"
        r="1"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphMinimal() {
  return (
    <GlyphSvg>
      <rect x="4" y="8.5" width="24" height="7" rx="3.5" className={DIM} />
      <rect
        {...motion("blink")}
        x="8"
        y="10.4"
        width="1.4"
        height="3.2"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

const CLOUD =
  "M9.5 19.5h13.2a4.6 4.6 0 0 0 .6-9.16A6.6 6.6 0 0 0 10.6 9.6a5 5 0 0 0-1.1 9.9z";

function GlyphCloudAuth() {
  return (
    <GlyphSvg>
      <path {...motion("draw")} pathLength={100} d={CLOUD} className={DIM} />
      <g {...motion("rise", 300)}>
        <circle cx="16" cy="12.4" r="1.5" className={ACCENT_STROKE} />
        <path
          d="M13.2 17.2c.5-1.6 1.5-2.3 2.8-2.3s2.3.7 2.8 2.3"
          className={ACCENT_STROKE}
        />
      </g>
    </GlyphSvg>
  );
}

function GlyphCloudHarness() {
  return (
    <GlyphSvg>
      <g transform="translate(6.1 -3.6) scale(0.62)">
        <path d={CLOUD} className={cn(DIM, "[stroke-width:2]")} />
      </g>
      <rect x="3.5" y="15" width="9" height="6" rx="1.2" className={DIM} />
      <rect x="19.5" y="15" width="9" height="6" rx="1.2" className={DIM} />
      <path
        {...motion("draw", 100)}
        pathLength={100}
        d="M8 15V12.5H13"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 220)}
        pathLength={100}
        d="M24 15V12.5H19"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphChain() {
  return (
    <GlyphSvg>
      <rect
        {...motion("shift", 0, { "--glyph-dx": "-1.4px" })}
        x="4"
        y="8.5"
        width="14"
        height="7"
        rx="3.5"
        className={DIM}
      />
      <rect
        {...motion("shift", 0, { "--glyph-dx": "1.4px" })}
        x="14"
        y="8.5"
        width="14"
        height="7"
        rx="3.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphPorts() {
  return (
    <GlyphSvg>
      <rect x="3.5" y="5" width="9" height="14" rx="1.6" className={DIM} />
      <rect x="19.5" y="5" width="9" height="14" rx="1.6" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M12.5 8.5H19.5"
        className={DIM}
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M12.5 12H19.5"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 180)}
        pathLength={100}
        d="M12.5 15.5H19.5"
        className={DIM}
      />
    </GlyphSvg>
  );
}

function GlyphAgent() {
  return (
    <GlyphSvg>
      <circle cx="16" cy="12" r="7.5" className={DIM} />
      <circle cx="13.4" cy="11" r="0.9" className={DOT} />
      <circle cx="18.6" cy="11" r="0.9" className={DOT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M13.2 14.6c.8 1 1.7 1.4 2.8 1.4s2-.4 2.8-1.4"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphEditor() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <path d="M8.5 7.5V20.5" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M11.5 11H18"
        className={DIM}
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M13.5 14H24"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 180)}
        pathLength={100}
        d="M11.5 17H16.5"
        className={DIM}
      />
    </GlyphSvg>
  );
}

/* ------------------------------------------------------------- examples ---- */

function GlyphStream() {
  return (
    <GlyphSvg>
      <path d="M4.5 7H27" className={DIM} />
      <path d="M4.5 12H22" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M4.5 17H17"
        className={ACCENT_STROKE}
      />
      <rect
        {...motion("blink", 380)}
        x="19"
        y="15.4"
        width="1.5"
        height="3.2"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphArtifact() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <path d="M13 7.5V20.5" className={FAINT} />
      <path d="M5.5 11H10.5M5.5 14H9" className={DIM} />
      <rect
        {...motion("march")}
        x="15.5"
        y="10"
        width="11"
        height="8"
        rx="1"
        className="[stroke-dasharray:2_2]"
      />
      <rect
        {...motion("pop", 160)}
        x="18.5"
        y="12.3"
        width="5"
        height="3.4"
        rx="0.8"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphGraph() {
  return (
    <GlyphSvg>
      <path
        {...motion("draw")}
        pathLength={100}
        d="M8.6 8.3L14.2 15.2"
        className={DIM}
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M17.8 15.2L23.4 8.3"
        className={DIM}
      />
      <path
        {...motion("draw", 180)}
        pathLength={100}
        d="M9.5 6.5H22.5"
        className={FAINT}
      />
      <circle cx="7" cy="6.5" r="2.5" className="fill-background" />
      <circle cx="25" cy="6.5" r="2.5" className="fill-background" />
      <circle
        {...motion("pop", 260)}
        cx="16"
        cy="17.5"
        r="2.8"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphAgentTree() {
  return (
    <GlyphSvg>
      <rect
        x="11.5"
        y="3"
        width="9"
        height="5.5"
        rx="1.3"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M16 8.5V12H8V15.5"
        className={DIM}
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M16 12H24V15.5"
        className={DIM}
      />
      <rect
        {...motion("pop", 220)}
        x="4"
        y="15.5"
        width="8"
        height="5.5"
        rx="1.3"
        className="fill-background"
      />
      <rect
        {...motion("pop", 300)}
        x="20"
        y="15.5"
        width="8"
        height="5.5"
        rx="1.3"
        className="fill-background"
      />
    </GlyphSvg>
  );
}

function GlyphTwoWay() {
  return (
    <GlyphSvg>
      <rect x="3" y="6.5" width="8" height="11" rx="1.6" className={DIM} />
      <circle cx="25" cy="12" r="4.5" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M12.5 10H19M17 8L19 10L17 12"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 160)}
        pathLength={100}
        d="M19 14.5H12.5M14.5 12.5L12.5 14.5L14.5 16.5"
      />
    </GlyphSvg>
  );
}

function GlyphPipe() {
  return (
    <GlyphSvg>
      <path d="M3 8.5H29M3 15.5H29" className={DIM} />
      <rect
        x="7"
        y="10.5"
        width="4"
        height="3"
        rx="0.8"
        className="fill-foreground/12 stroke-none"
      />
      <rect
        {...motion("shift", 0, { "--glyph-dx": "6px" })}
        x="13.5"
        y="10.5"
        width="5"
        height="3"
        rx="0.8"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphResume() {
  return (
    <GlyphSvg>
      <path d="M3.5 12H10" className={DIM} />
      <path d="M11.5 9V15M14 9V15" className="[stroke-width:1.5]" />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M17.5 12H28.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphSteps() {
  const steps = [5.5, 12, 18.5];
  return (
    <GlyphSvg>
      <path d="M7.5 7.3V10.2M7.5 13.8V16.7" className={FAINT} />
      {steps.map((y, index) => (
        <g key={y}>
          <circle
            cx="7.5"
            cy={y}
            r="1.7"
            className={index === 2 ? cn(SOLID, ACCENT_FILL) : "fill-background"}
          />
          <path
            {...motion("draw", index * 110)}
            pathLength={100}
            d={`M12 ${y}H${[25, 21, 23.5][index]}`}
            className={DIM}
          />
        </g>
      ))}
    </GlyphSvg>
  );
}

function GlyphStore() {
  return (
    <GlyphSvg>
      <ellipse cx="16" cy="6.5" rx="7.5" ry="2.7" />
      <path
        d="M8.5 6.5V17.5c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7V6.5"
        className={DIM}
      />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M8.5 12c0 1.5 3.4 2.7 7.5 2.7s7.5-1.2 7.5-2.7"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphPointer() {
  return (
    <GlyphSvg>
      <rect x="4" y="4.5" width="17" height="11.5" rx="2" className={DIM} />
      <rect
        x="7"
        y="7.5"
        width="7"
        height="3"
        rx="1.5"
        className="fill-foreground/15 stroke-none"
      />
      <path
        {...motion("shift", 0, { "--glyph-dx": "-2px", "--glyph-dy": "-2px" })}
        d="M18.5 12.5L27 15.7L23.3 17.1L21.9 20.8Z"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphMarkup() {
  return (
    <GlyphSvg>
      <path {...motion("draw")} pathLength={100} d="M10.5 6.5L5 12L10.5 17.5" />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M21.5 6.5L27 12L21.5 17.5"
      />
      <rect
        {...motion("pop", 240)}
        x="13.5"
        y="9.5"
        width="5"
        height="5"
        rx="1.1"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphThreadList() {
  return (
    <GlyphSvg>
      <rect x="3.5" y="4" width="25" height="16" rx="2" className={DIM} />
      <path d="M13 4V20" className={FAINT} />
      <path d="M6 8H10.5M6 16H10.5" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M6 12H10.5"
        className={cn("[stroke-width:2.2]", ACCENT_STROKE)}
      />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M16 9.5H25"
        className={DIM}
      />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M16 13H22"
        className={FAINT}
      />
    </GlyphSvg>
  );
}

function GlyphForm() {
  return (
    <GlyphSvg>
      <rect x="5" y="3.5" width="22" height="5" rx="1.2" className={DIM} />
      <rect x="5" y="10.5" width="22" height="5" rx="1.2" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M7.5 6H14M7.5 13H12"
        className={FAINT}
      />
      <rect
        {...motion("pop", 200)}
        x="18"
        y="17.5"
        width="9"
        height="3.5"
        rx="1.2"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphFilm() {
  const ticks = [7.5, 12, 16.5, 21, 25.5];
  return (
    <GlyphSvg>
      <rect x="3.5" y="4" width="25" height="16" rx="2" className={DIM} />
      {ticks.map((x) => (
        <path
          key={x}
          d={`M${x - 1} 6.6H${x + 1}M${x - 1} 17.4H${x + 1}`}
          className={FAINT}
        />
      ))}
      <path
        {...motion("pop", 120)}
        d="M14 9.3L19.5 12L14 14.7Z"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphWaveform() {
  const bars = [3, 6.5, 4.5, 8.5, 5, 7, 3];
  return (
    <GlyphSvg>
      {bars.map((half, index) => (
        <path
          key={index}
          {...motion("twinkle", index * 80)}
          d={`M${5.5 + index * 3.5} ${12 - half}V${12 + half}`}
          className={cn(
            "[stroke-width:1.6]",
            index === 3 ? ACCENT_STROKE : DIM,
          )}
        />
      ))}
    </GlyphSvg>
  );
}

function GlyphBroadcast() {
  return (
    <GlyphSvg>
      <path
        {...motion("fade", 240)}
        d="M7.7 4.5a10.5 10.5 0 0 0 0 15M24.3 4.5a10.5 10.5 0 0 1 0 15"
        className={FAINT}
      />
      <path
        {...motion("fade", 120)}
        d="M11.3 7.5a6.4 6.4 0 0 0 0 9M20.7 7.5a6.4 6.4 0 0 1 0 9"
        className={DIM}
      />
      <circle
        {...motion("pop")}
        cx="16"
        cy="12"
        r="2"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphDictation() {
  return (
    <GlyphSvg>
      <rect x="6" y="4" width="5" height="9.5" rx="2.5" />
      <path d="M4 11.5a4.5 4.5 0 0 0 9 0M8.5 16V19.5" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M17 8H27.5"
        className={DIM}
      />
      <path
        {...motion("draw", 110)}
        pathLength={100}
        d="M17 12H24"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 220)}
        pathLength={100}
        d="M17 16H26"
        className={DIM}
      />
    </GlyphSvg>
  );
}

function GlyphRoutes() {
  return (
    <GlyphSvg>
      <path d="M3.5 12H11" />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M11 12c5 0 5-6 10-6h4.5"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 140)}
        pathLength={100}
        d="M11 12c5 0 5 6 10 6h4.5"
        className={DIM}
      />
      <circle cx="27" cy="6" r="1.5" className="fill-background" />
      <circle cx="27" cy="18" r="1.5" className="fill-background" />
    </GlyphSvg>
  );
}

function GlyphLocal() {
  return (
    <GlyphSvg>
      <rect x="5" y="4" width="22" height="16" rx="2.5" className={DIM} />
      <path
        {...motion("spin")}
        d="M20.2 12a4.2 4.2 0 1 1-1.5-3.2M18.9 6.4V8.9H16.4"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphLayers() {
  return (
    <GlyphSvg>
      <path
        {...motion("settle", 200)}
        d="M6 16.5L16 20.5L26 16.5"
        className={FAINT}
      />
      <path
        {...motion("settle", 100)}
        d="M6 12.5L16 16.5L26 12.5"
        className={DIM}
      />
      <path
        {...motion("drop")}
        d="M16 3.5L26 7.5L16 11.5L6 7.5Z"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

/* ------------------------------------------------------------- the rest ---- */

const BRACE_LEFT =
  "M12.5 5.5c-2 0-2.5 1-2.5 2.6v1.6c0 1.4-.6 2.3-2 2.3 1.4 0 2 .9 2 2.3v1.6c0 1.6.5 2.6 2.5 2.6";
const BRACE_RIGHT =
  "M19.5 5.5c2 0 2.5 1 2.5 2.6v1.6c0 1.4.6 2.3 2 2.3-1.4 0-2 .9-2 2.3v1.6c0 1.6-.5 2.6-2.5 2.6";

function GlyphSchema() {
  return (
    <GlyphSvg>
      <path d={BRACE_LEFT} className={DIM} />
      <path d={BRACE_RIGHT} className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M13.2 12.2L15.2 14.2L18.9 10"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphGateway() {
  return (
    <GlyphSvg>
      <path d="M3.5 12H11" />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M11 12c4 0 4-6.5 8-6.5h8.5"
        className={DIM}
      />
      <path
        {...motion("draw", 90)}
        pathLength={100}
        d="M11 12H27.5"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 180)}
        pathLength={100}
        d="M11 12c4 0 4 6.5 8 6.5h8.5"
        className={DIM}
      />
      <circle cx="11" cy="12" r="1.8" className="fill-background" />
    </GlyphSvg>
  );
}

function GlyphLock() {
  return (
    <GlyphSvg>
      <path
        {...motion("bob")}
        d="M12 10.5V8a4 4 0 0 1 8 0v2.5"
        className={DIM}
      />
      <rect x="9.5" y="10.5" width="13" height="9.5" rx="2" />
      <circle cx="16" cy="14.4" r="1.2" className={cn(SOLID, ACCENT_FILL)} />
      <path d="M16 15.6V17.2" className={ACCENT_STROKE} />
    </GlyphSvg>
  );
}

function GlyphKey() {
  return (
    <GlyphSvg>
      <g {...motion("tilt")}>
        <circle cx="10" cy="12" r="4.5" />
        <path d="M14.5 12H27.5" className={DIM} />
        <path d="M22.5 12V15M26 12V14.5" className={ACCENT_STROKE} />
      </g>
    </GlyphSvg>
  );
}

function GlyphUser() {
  return (
    <GlyphSvg>
      <circle cx="14" cy="8.5" r="3.5" />
      <path d="M6.5 20c.7-4 3.6-6 7.5-6s6.8 2 7.5 6" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M21.5 8L23.2 9.7L26.5 6.2"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphClip() {
  return (
    <GlyphSvg>
      <path
        {...motion("draw")}
        pathLength={100}
        d="M19.5 8.2L12.4 15.3a2.2 2.2 0 0 0 3.1 3.1l7.5-7.5a3.9 3.9 0 0 0-5.5-5.5l-7.7 7.7a5.6 5.6 0 0 0 7.9 7.9l5.3-5.3"
      />
      <circle
        {...motion("pop", 420)}
        cx="23"
        cy="15.7"
        r="1.1"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphServer() {
  return (
    <GlyphSvg>
      <rect x="5" y="4" width="22" height="7" rx="1.5" className={DIM} />
      <rect x="5" y="13" width="22" height="7" rx="1.5" className={DIM} />
      <path d="M18.5 7.5H24M18.5 16.5H24" className={FAINT} />
      <circle cx="8.5" cy="7.5" r="0.9" className={DOT} />
      <circle
        {...motion("blink")}
        cx="8.5"
        cy="16.5"
        r="1"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphBolt() {
  return (
    <GlyphSvg>
      <path d={BRACE_LEFT} className={FAINT} transform="translate(-3 0)" />
      <path d={BRACE_RIGHT} className={FAINT} transform="translate(3 0)" />
      <path
        {...motion("bob")}
        d="M17.2 4.5L11.5 13H15.5L14.8 19.5L20.5 11H16.5Z"
        className={cn("fill-foreground/15", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphToolCard() {
  return (
    <GlyphSvg>
      <rect x="4" y="4" width="24" height="16" rx="2" className={DIM} />
      <path d="M4 9.5H28" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M7 6.7L8 7.7L9.8 5.8"
        className={ACCENT_STROKE}
      />
      <path d="M12.5 6.8H19" className={DIM} />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M7 13H21"
        className={DIM}
      />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M7 16.5H16.5"
        className={FAINT}
      />
    </GlyphSvg>
  );
}

function GlyphFormats() {
  return (
    <GlyphSvg>
      <rect
        {...motion("settle", 200)}
        x="5"
        y="8"
        width="13"
        height="12"
        rx="1.5"
        className={FAINT}
      />
      <rect
        {...motion("settle", 100)}
        x="9.5"
        y="6"
        width="13"
        height="12"
        rx="1.5"
        className={cn("fill-background", DIM)}
      />
      <rect
        {...motion("drop")}
        x="14"
        y="4"
        width="13"
        height="12"
        rx="1.5"
        className={cn("fill-background", ACCENT_STROKE)}
      />
    </GlyphSvg>
  );
}

function GlyphHash() {
  return (
    <GlyphSvg>
      <path {...motion("draw")} pathLength={100} d="M12.8 4.5L10.8 19.5" />
      <path {...motion("draw", 80)} pathLength={100} d="M20.8 4.5L18.8 19.5" />
      <path
        {...motion("draw", 160)}
        pathLength={100}
        d="M7 9.2H25.5"
        className={ACCENT_STROKE}
      />
      <path
        {...motion("draw", 240)}
        pathLength={100}
        d="M6.5 14.8H25"
        className={DIM}
      />
    </GlyphSvg>
  );
}

function GlyphBubbles() {
  return (
    <GlyphSvg>
      <path
        d="M6 4h10a2.5 2.5 0 0 1 2.5 2.5v4A2.5 2.5 0 0 1 16 13H9l-3 2.5V13a2.5 2.5 0 0 1-2.5-2.5v-4A2.5 2.5 0 0 1 6 4z"
        className={DIM}
      />
      <path
        {...motion("pop", 120)}
        d="M16 10.5h10a2.5 2.5 0 0 1 2.5 2.5v3.5A2.5 2.5 0 0 1 26 19v2.5L23 19h-7a2.5 2.5 0 0 1-2.5-2.5V13a2.5 2.5 0 0 1 2.5-2.5z"
        className={cn("fill-background", ACCENT_STROKE)}
      />
    </GlyphSvg>
  );
}

function GlyphShapes() {
  return (
    <GlyphSvg>
      <circle {...motion("pop")} cx="7.5" cy="12" r="3.7" className={DIM} />
      <rect
        {...motion("pop", 90)}
        x="12.7"
        y="8.5"
        width="7"
        height="7"
        rx="1.2"
      />
      <path
        {...motion("pop", 180)}
        d="M25.2 8.2L29.2 15.5H21.2Z"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphCompose() {
  return (
    <GlyphSvg>
      <rect x="5" y="3.5" width="22" height="17" rx="2" className={DIM} />
      <rect
        {...motion("pop")}
        x="8"
        y="6.5"
        width="16"
        height="3"
        rx="0.8"
        className="fill-foreground/15 stroke-none"
      />
      <rect
        {...motion("pop", 100)}
        x="8"
        y="11.5"
        width="7"
        height="6"
        rx="0.8"
        className="fill-foreground/15 stroke-none"
      />
      <rect
        {...motion("pop", 200)}
        x="17"
        y="11.5"
        width="7"
        height="6"
        rx="0.8"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphMarkdown() {
  return (
    <GlyphSvg>
      <rect x="4" y="5.5" width="24" height="13" rx="2" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M8 15.5V8.5L11 12L14 8.5V15.5"
      />
      <g {...motion("bob", 200)}>
        <path
          d="M21.5 8.5V15M18.8 12.4L21.5 15.1L24.2 12.4"
          className={ACCENT_STROKE}
        />
      </g>
    </GlyphSvg>
  );
}

function GlyphSetup() {
  return (
    <GlyphSvg>
      <WindowChrome y={4} height={16} />
      <path d="M6.5 11.5L9 13.5L6.5 15.5" />
      <path
        {...motion("draw", 80)}
        pathLength={100}
        d="M12.5 13.7L14.3 15.5L18 11.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphUpdate() {
  return (
    <GlyphSvg>
      <circle cx="16" cy="12" r="8" className={DIM} />
      <g {...motion("rise")}>
        <path
          d="M16 16V8.5M12.8 11.7L16 8.5L19.2 11.7"
          className={ACCENT_STROKE}
        />
      </g>
    </GlyphSvg>
  );
}

function GlyphCopilot() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <path d="M19.5 7.5V20.5" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M5.5 11H15M5.5 14H12"
        className={DIM}
      />
      <rect
        {...motion("pop", 160)}
        x="21.5"
        y="10"
        width="5.5"
        height="3"
        rx="1.2"
        className={cn(SOLID, ACCENT_FILL)}
      />
      <path d="M21.5 16H25" className={DIM} />
    </GlyphSvg>
  );
}

function GlyphPeers() {
  return (
    <GlyphSvg>
      <circle cx="8.5" cy="12" r="4.5" className={DIM} />
      <circle cx="23.5" cy="12" r="4.5" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M13 10.5H19"
        className={ACCENT_STROKE}
      />
      <path {...motion("draw", 140)} pathLength={100} d="M19 13.5H13" />
    </GlyphSvg>
  );
}

function GlyphDocEdit() {
  return (
    <GlyphSvg>
      <rect x="5" y="3" width="15" height="18" rx="2" className={DIM} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M8.5 8H16.5M8.5 11.5H14"
        className={DIM}
      />
      <path
        {...motion("shift", 0, {
          "--glyph-dx": "-1.5px",
          "--glyph-dy": "1.5px",
        })}
        d="M17 19L18 15.5L24.5 9L27 11.5L20.5 18Z"
        className={cn("fill-background", ACCENT_STROKE)}
      />
    </GlyphSvg>
  );
}

function GlyphExtension() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <circle
        cx="26.2"
        cy="5.5"
        r="1"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
      <rect
        {...motion("pop", 100)}
        x="17.5"
        y="9"
        width="9.5"
        height="9"
        rx="1.3"
        className="fill-background"
      />
      <path
        {...motion("draw", 220)}
        pathLength={100}
        d="M19.5 12H24.5M19.5 15H23"
        className={DIM}
      />
    </GlyphSvg>
  );
}

function GlyphImage() {
  return (
    <GlyphSvg>
      <rect x="5" y="4" width="22" height="16" rx="2" className={DIM} />
      <circle
        {...motion("pop")}
        cx="11"
        cy="9.5"
        r="2"
        className={cn(SOLID, ACCENT_FILL)}
      />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M5.5 18L12 12.5L16.5 16L20 13.5L26.5 18"
      />
    </GlyphSvg>
  );
}

function GlyphPeaks() {
  return (
    <GlyphSvg>
      <path d="M3.5 19.5H28.5" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M5 19.5L12 6.5L16.5 14.5"
        className={DIM}
      />
      <path
        {...motion("draw", 140)}
        pathLength={100}
        d="M14 19.5L20.5 9.5L27 19.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

const S_CURVE =
  "M21.5 7.5c-2-2.5-8-2.5-9 1-1 3.5 7.5 3.5 6.5 7.5-1 3.5-7 3.5-9 1";

function GlyphCurve() {
  return (
    <GlyphSvg>
      <path {...motion("draw")} pathLength={100} d={S_CURVE} />
      <circle
        {...motion("pop", 360)}
        cx="21.5"
        cy="7.5"
        r="1.3"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphCurveWindow() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <g transform="translate(5.6 6.2) scale(0.65)">
        <path
          {...motion("draw")}
          pathLength={100}
          d={S_CURVE}
          className={cn("[stroke-width:1.9]", ACCENT_STROKE)}
        />
      </g>
    </GlyphSvg>
  );
}

function GlyphSlabs() {
  return (
    <GlyphSvg>
      <path
        {...motion("settle", 200)}
        d="M9 9L23 6L25 9L11 12Z"
        className={DIM}
      />
      <path
        {...motion("settle", 100)}
        d="M7 13.5L21 10.5L23 13.5L9 16.5Z"
        className={cn("fill-background", ACCENT_STROKE)}
      />
      <path
        {...motion("settle")}
        d="M9 18L23 15L25 18L11 21Z"
        className={DIM}
      />
    </GlyphSvg>
  );
}

function GlyphSlabsStart() {
  return (
    <GlyphSvg>
      <path d="M4 9.5L16 7L17.7 9.5L5.7 12Z" className={DIM} />
      <path d="M4 15L16 12.5L17.7 15L5.7 17.5Z" className={DIM} />
      <path
        {...motion("pop", 120)}
        d="M21 8.5L27.5 12L21 15.5Z"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphPi() {
  return (
    <GlyphSvg>
      <path {...motion("draw")} pathLength={100} d="M7 7.5H25" />
      <path
        {...motion("draw", 110)}
        pathLength={100}
        d="M12 7.5V18.5"
        className={DIM}
      />
      <path
        {...motion("draw", 220)}
        pathLength={100}
        d="M20 7.5V16c0 1.8 1 2.5 2.5 2.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphInkWeb() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <rect
        x="6"
        y="9.5"
        width="20"
        height="8.5"
        rx="1.2"
        className="fill-foreground/12 stroke-none"
      />
      <path d="M8.5 12.2L10.4 13.7L8.5 15.2" />
      <rect
        {...motion("blink")}
        x="12.2"
        y="12.6"
        width="2.2"
        height="2.2"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphState() {
  const cells = [8, 13.75, 19.5];
  return (
    <GlyphSvg>
      <rect x="5" y="4" width="22" height="16" rx="2.5" className={DIM} />
      {cells.map((x, index) => (
        <rect
          key={x}
          {...motion("pop", index * 90)}
          x={x}
          y="9"
          width="4.5"
          height="6"
          rx="1"
          className={
            index === 1
              ? cn(SOLID, ACCENT_FILL)
              : "fill-foreground/15 stroke-none"
          }
        />
      ))}
    </GlyphSvg>
  );
}

function GlyphVirtual() {
  return (
    <GlyphSvg>
      <path d="M8.5 3.5H23.5M8.5 20.5H23.5" className={FAINT} />
      <path d="M8.5 9H23.5M8.5 15H23.5" className={DIM} />
      <path d="M8.5 12H23.5" />
      <rect
        {...motion("shift", 0, { "--glyph-dy": "2px" })}
        x="5.5"
        y="6.5"
        width="21"
        height="11"
        rx="1.6"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphGlobe() {
  return (
    <GlyphSvg>
      <circle cx="16" cy="12" r="8" className={DIM} />
      <ellipse cx="16" cy="12" rx="3.5" ry="8" className={FAINT} />
      <path d="M8 12H24" className={FAINT} />
      <circle
        {...motion("pop")}
        cx="21.7"
        cy="6.3"
        r="1.6"
        className={cn(SOLID, ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphInspect() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <path d="M6 11H12M6 14H10" className={DIM} />
      <g
        {...motion("shift", 0, { "--glyph-dx": "-2px", "--glyph-dy": "-1px" })}
      >
        <circle cx="19" cy="13" r="3.2" className={ACCENT_STROKE} />
        <path d="M21.3 15.3L24.3 18.3" className={ACCENT_STROKE} />
      </g>
    </GlyphSvg>
  );
}

function GlyphFlue() {
  return (
    <GlyphSvg>
      <rect x="10.5" y="3.5" width="11" height="17" rx="2" className={DIM} />
      <g {...motion("rise", 140)}>
        <path d="M13.5 11L16 8.5L18.5 11" className={DIM} />
      </g>
      <g {...motion("rise")}>
        <path d="M13.5 16L16 13.5L18.5 16" className={ACCENT_STROKE} />
      </g>
    </GlyphSvg>
  );
}

const GLYPHS: Record<string, () => ReactNode> = {
  "templates/default": GlyphThread,
  "templates/minimal": GlyphMinimal,
  "templates/cloud": GlyphCloud,
  "templates/cloud-clerk": GlyphCloudAuth,
  "templates/cloud-harness": GlyphCloudHarness,
  "templates/langchain": GlyphChain,
  "templates/mcp": GlyphPorts,
  "templates/eve": GlyphAgent,
  "templates/vscode": GlyphEditor,
  "examples/with-ai-sdk-v7": GlyphStream,
  "examples/with-eve": GlyphAgent,
  "examples/with-artifacts": GlyphArtifact,
  "examples/with-langgraph": GlyphGraph,
  "examples/with-google-adk": GlyphAgentTree,
  "examples/with-cloud": GlyphCloud,
  "examples/with-ag-ui": GlyphTwoWay,
  "examples/with-assistant-transport": GlyphPipe,
  "examples/with-resumable-stream": GlyphResume,
  "examples/with-chain-of-thought": GlyphSteps,
  "examples/with-external-store": GlyphStore,
  "examples/with-interactables": GlyphPointer,
  "examples/with-openui": GlyphMarkup,
  "examples/with-custom-thread-list": GlyphThreadList,
  "examples/with-react-hook-form": GlyphForm,
  "examples/with-ffmpeg": GlyphFilm,
  "examples/with-elevenlabs-conversational": GlyphWaveform,
  "examples/with-livekit": GlyphBroadcast,
  "examples/with-elevenlabs-scribe": GlyphDictation,
  "examples/with-expo": GlyphNative,
  "examples/with-react-ink": GlyphInk,
  "examples/with-react-router": GlyphRoutes,
  "examples/with-tanstack": GlyphLayers,
  "templates/nuxt": GlyphPeaks,
  "examples/waterfall": GlyphO11y,
  "examples/with-a2a": GlyphPeers,
  "examples/with-agent-document-editor": GlyphDocEdit,
  "examples/with-article-assistant": GlyphCopilot,
  "examples/with-browser-extension": GlyphExtension,
  "examples/with-flue": GlyphFlue,
  "examples/with-generative-ui": GlyphCompose,
  "examples/with-heat-graph": GlyphHeat,
  "examples/with-image-generation": GlyphImage,
  "examples/with-langchain": GlyphChain,
  "examples/with-mcp": GlyphPorts,
  "examples/with-nuxt": GlyphPeaks,
  "examples/with-opencode": GlyphSetup,
  "examples/with-pi": GlyphPi,
  "examples/with-pydantic-ai-durable": GlyphSchema,
  "examples/with-react-ink-web": GlyphInkWeb,
  "examples/with-solid": GlyphSlabs,
  "examples/with-solid-start": GlyphSlabsStart,
  "examples/with-store": GlyphState,
  "examples/with-svelte": GlyphCurve,
  "examples/with-sveltekit": GlyphCurveWindow,
  "examples/with-tap-runtime": GlyphLocal,
  "examples/with-virtualized-thread": GlyphVirtual,
  "examples/with-vscode": GlyphEditor,
  "examples/with-vue": GlyphVue,
  "examples/with-webmcp": GlyphGlobe,
  "runtimes/pi": GlyphPi,
  "utilities/devtools": GlyphInspect,
  "utilities/variants": GlyphFormats,
  "runtimes/eve-overview": GlyphAgent,
  "runtimes/custom-local-runtime": GlyphLocal,
  "runtimes/custom-external-store": GlyphStore,
  "runtimes/custom-data-stream": GlyphStream,
  "runtimes/custom-assistant-transport": GlyphPipe,
  "runtimes/openai-agents": GlyphAgentTree,
  "runtimes/pydantic-ai": GlyphSchema,
  "integrations/gateways": GlyphGateway,
  "integrations/observability-assistant-cloud": GlyphCloud,
  "integrations/auth-clerk": GlyphUser,
  "integrations/auth-better-auth": GlyphLock,
  "integrations/auth-next-auth": GlyphKey,
  "integrations/persistence-custom-adapter": GlyphStore,
  "integrations/attachments-custom-adapter": GlyphClip,
  "tools/defining-tools": GlyphSchema,
  "tools/backend": GlyphServer,
  "tools/dynamic-tools": GlyphBolt,
  "tools/tool-ui": GlyphToolCard,
  "tools/generative-ui": GlyphCompose,
  "tools/generative-ui-formats": GlyphFormats,
  "tools/generative-ui-slack": GlyphHash,
  "tools/generative-ui-teams": GlyphBubbles,
  "tools/generative-ui-primitive": GlyphShapes,
  "tools/interactables": GlyphPointer,
  "tools/a2ui": GlyphTwoWay,
  "tools/openui": GlyphMarkup,
  "tools/multi-agent": GlyphAgentTree,
  "utilities/heat-graph": GlyphHeat,
  "utilities/tw-shimmer": GlyphShimmer,
  "utilities/react-o11y": GlyphO11y,
  "utilities/safe-content-frame": GlyphFrame,
  "utilities/generative-frame": GlyphArtifact,
  "skills/assistant-ui": GlyphThread,
  "skills/cloud": GlyphCloud,
  "skills/copilots": GlyphCopilot,
  "skills/elements": GlyphElements,
  "skills/generative-ui": GlyphCompose,
  "skills/ink": GlyphInk,
  "skills/markdown": GlyphMarkdown,
  "skills/observability": GlyphO11y,
  "skills/primitives": GlyphShapes,
  "skills/react-mcp": GlyphPorts,
  "skills/react-native": GlyphNative,
  "skills/runtime": GlyphLocal,
  "skills/setup": GlyphSetup,
  "skills/streaming": GlyphStream,
  "skills/thread-list": GlyphThreadList,
  "skills/tools": GlyphToolCard,
  "skills/update": GlyphUpdate,
};

/** An item's own glyph, or its category's where it has none. */
export function ItemGlyph({ item }: { item: LibraryItem }) {
  const Glyph = GLYPHS[item.id];
  return Glyph ? <Glyph /> : <LibraryGlyph category={item.category} />;
}
