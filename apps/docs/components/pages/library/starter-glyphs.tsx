import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { starterId, type Starter } from "@/lib/library/starters-data";

// The library app (apps/library/components/library/item-glyph.tsx) draws these
// glyphs, and the docs app cannot import from it, so the starters' ones are
// copied here. Each is a 32 by 24 line drawing whose accent and motion play
// while its `group/navlink` card is hovered.

export const ACCENT_STROKE =
  "transition-colors duration-200 group-hover/navlink:stroke-blue-500 group-focus-visible/navlink:stroke-blue-500 group-aria-[current=page]/navlink:stroke-blue-500";

export const ACCENT_FILL =
  "transition-colors duration-200 group-hover/navlink:fill-blue-500 group-focus-visible/navlink:fill-blue-500 group-aria-[current=page]/navlink:fill-blue-500";

export const FAINT = "stroke-foreground/15";

export const DIM = "stroke-foreground/25";

type GlyphMotion =
  | "draw"
  | "fade"
  | "blip"
  | "march"
  | "pop"
  | "spin"
  | "drop"
  | "settle"
  | "shift"
  | "trade"
  | "trade-top"
  | "bob"
  | "tilt"
  | "rise"
  | "twinkle"
  | "blink"
  | "orbit";

export function motion(
  kind: GlyphMotion,
  delay = 0,
  vars: Record<`--glyph-${string}`, string> = {},
) {
  return {
    "data-glyph-motion": kind,
    style: { "--glyph-delay": `${delay}ms`, ...vars } as CSSProperties,
  };
}

export function GlyphSvg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 24"
      aria-hidden
      className="stroke-foreground/40 h-6 w-8 overflow-visible fill-none [stroke-width:1.25] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      {children}
    </svg>
  );
}

export function WindowChrome({
  y = 3.5,
  height = 17,
}: {
  y?: number;
  height?: number;
}) {
  return (
    <>
      <rect x="3" y={y} width="26" height={height} rx="2" className={DIM} />
      <path d={`M3 ${y + 4}H29`} className={FAINT} />
      <circle
        cx="5.6"
        cy={y + 2}
        r="0.75"
        className="fill-foreground/30 stroke-none"
      />
      <circle
        cx="7.9"
        cy={y + 2}
        r="0.75"
        className="fill-foreground/30 stroke-none"
      />
    </>
  );
}

export function GlyphNative() {
  return (
    <GlyphSvg>
      <g {...motion("tilt")}>
        <rect x="11" y="1.75" width="10.5" height="20.5" rx="2.4" />
        <path d="M14.75 4.2H17.75" className={FAINT} />
        <rect
          {...motion("pop", 150)}
          x="13.2"
          y="7"
          width="6"
          height="2.4"
          rx="1.2"
          className="fill-foreground/15 stroke-none"
        />
        <path
          {...motion("draw", 220)}
          pathLength={100}
          d="M13.2 12.5H19.3"
          className={DIM}
        />
        <path
          {...motion("draw", 290)}
          pathLength={100}
          d="M13.2 15H17.3"
          className={DIM}
        />
        <path d="M14.5 19.5H18" className={ACCENT_STROKE} />
      </g>
    </GlyphSvg>
  );
}

export function GlyphInk() {
  return (
    <GlyphSvg>
      <WindowChrome y={4} height={16} />
      <path d="M6.5 11.5L9 13.5L6.5 15.5" />
      <path
        {...motion("draw", 60)}
        pathLength={100}
        d="M11 13.5H17.5"
        className={DIM}
      />
      <rect
        {...motion("blink", 380)}
        x="19"
        y="12.3"
        width="2.4"
        height="2.6"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

export function GlyphCloud() {
  return (
    <GlyphSvg>
      <path
        {...motion("draw")}
        pathLength={100}
        d="M9.5 19.5h13.2a4.6 4.6 0 0 0 .6-9.16A6.6 6.6 0 0 0 10.6 9.6a5 5 0 0 0-1.1 9.9z"
      />
      <g {...motion("rise", 300)}>
        <path
          d="M16 17V11.5M13.6 13.9L16 11.5L18.4 13.9"
          className={ACCENT_STROKE}
        />
      </g>
    </GlyphSvg>
  );
}

export const SOLID = "fill-foreground/35 stroke-none";

export const DOT = "fill-foreground/30 stroke-none";

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

export function GlyphAgent() {
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

export function GlyphStream() {
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

export function GlyphPointer() {
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

export function GlyphThreadList() {
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

export function GlyphLayers() {
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

const STARTER_GLYPHS: Record<string, () => ReactNode> = {
  "templates/default": GlyphThread,
  "templates/minimal": GlyphMinimal,
  "templates/cloud": GlyphCloud,
  "templates/cloud-clerk": GlyphCloudAuth,
  "templates/cloud-harness": GlyphCloudHarness,
  "templates/langchain": GlyphChain,
  "templates/mcp": GlyphPorts,
  "templates/eve": GlyphAgent,
  "templates/vscode": GlyphEditor,
  "templates/nuxt": GlyphRoutes,
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
  "examples/recipe-chat-history": GlyphThreadList,
  "examples/recipe-own-backend": GlyphPipe,
  "examples/recipe-tool-approval": GlyphSteps,
  "examples/recipe-tool-ui": GlyphArtifact,
  "examples/with-a2a": GlyphTwoWay,
  "examples/with-opencode": GlyphEditor,
  "examples/with-pi": GlyphAgent,
  "examples/with-flue": GlyphResume,
  "examples/with-langchain": GlyphChain,
  "examples/with-pydantic-ai-durable": GlyphResume,
  "examples/with-mcp": GlyphPorts,
  "examples/with-webmcp": GlyphPorts,
  "examples/with-generative-ui": GlyphMarkup,
  "examples/with-agent-document-editor": GlyphArtifact,
  "examples/with-article-assistant": GlyphPointer,
  "examples/with-image-generation": GlyphFilm,
  "examples/with-virtualized-thread": GlyphThreadList,
  "examples/with-tap-runtime": GlyphPipe,
  "examples/with-store": GlyphStore,
  "examples/with-heat-graph": GlyphGraph,
  "examples/waterfall": GlyphSteps,
  "examples/with-react-ink-web": GlyphInk,
  "examples/with-vscode": GlyphEditor,
  "examples/with-browser-extension": GlyphLayers,
  "examples/with-nuxt": GlyphRoutes,
  "examples/with-vue": GlyphLayers,
  "examples/with-sveltekit": GlyphRoutes,
  "examples/with-svelte": GlyphLayers,
  "examples/with-solid-start": GlyphRoutes,
  "examples/with-solid": GlyphLayers,
  "playgrounds/base": GlyphThread,
  "playgrounds/base-assistant-ui": GlyphForm,
  "playgrounds/product-docs": GlyphArtifact,
  "playgrounds/developer-api": GlyphPorts,
  "playgrounds/website-copilot": GlyphPointer,
  "playgrounds/docs-search": GlyphThreadList,
  "playgrounds/code-examples": GlyphMarkup,
  "playgrounds/integration-health": GlyphTwoWay,
  "playgrounds/incident-command": GlyphSteps,
  "playgrounds/billing-operations": GlyphStore,
};

export function StarterGlyph({ starter }: { starter: Starter }) {
  const Glyph = STARTER_GLYPHS[starterId(starter)] ?? GlyphThread;
  return <Glyph />;
}
