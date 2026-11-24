import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * The grammar every glyph in the library is drawn in, and the ones it shares
 * with the docs site's header: a 32 by 24 line drawing with one accented part.
 * The accent shows while its link is hovered, focused or the current page, and
 * the parts marked with a motion play then; the keyframes are the site's.
 */

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

export function GlyphElements() {
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
          className={
            index === 0
              ? cn("fill-foreground/35 stroke-none", ACCENT_FILL)
              : DIM
          }
        />
      ))}
    </GlyphSvg>
  );
}

export function GlyphVue() {
  return (
    <GlyphSvg>
      <path d="M5 4.5H9" />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M11.5 4.5H27"
        className={FAINT}
      />
      <rect x="5" y="8" width="22" height="8" rx="1.5" className={DIM} />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M8.5 10.75H20"
        className={DIM}
      />
      <path
        {...motion("draw", 220)}
        pathLength={100}
        d="M8.5 13.25H15"
        className={ACCENT_STROKE}
      />
      <path d="M5 19.5H9" />
      <path
        {...motion("draw", 320)}
        pathLength={100}
        d="M11.5 19.5H27"
        className={FAINT}
      />
    </GlyphSvg>
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

export function GlyphShimmer() {
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

export function GlyphHeat() {
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

export function GlyphFrame() {
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
        className={cn("fill-foreground/35 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

export function GlyphO11y() {
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

export function GlyphExamples() {
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
