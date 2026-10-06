import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { NavGlyphKind } from "@/lib/constants";

const ACCENT_STROKE =
  "transition-colors duration-200 group-hover/navglyph:stroke-blue-500 group-focus-visible/navglyph:stroke-blue-500";
const ACCENT_FILL =
  "transition-colors duration-200 group-hover/navglyph:fill-blue-500 group-focus-visible/navglyph:fill-blue-500";
const FAINT = "stroke-foreground/15";
const DIM = "stroke-foreground/25";

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
  | "bob"
  | "tilt"
  | "rise"
  | "twinkle"
  | "blink"
  | "orbit";

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
      className="stroke-foreground/40 h-6 w-8 overflow-visible fill-none [stroke-width:1.25] [stroke-linecap:round] [stroke-linejoin:round]"
    >
      {children}
    </svg>
  );
}

function WindowChrome({
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

function GlyphElements() {
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

function GlyphDesign() {
  const handles: Array<[number, number, string, string]> = [
    [6, 5, "-1.5px", "-1.5px"],
    [26, 5, "1.5px", "-1.5px"],
    [6, 19, "-1.5px", "1.5px"],
    [26, 19, "1.5px", "1.5px"],
  ];
  return (
    <GlyphSvg>
      <rect
        {...motion("march")}
        x="6"
        y="5"
        width="20"
        height="14"
        className={cn(DIM, "[stroke-dasharray:2_2]")}
      />
      {handles.map(([x, y, dx, dy], index) => (
        <rect
          key={index}
          {...motion("shift", 0, { "--glyph-dx": dx, "--glyph-dy": dy })}
          x={x - 1.4}
          y={y - 1.4}
          width="2.8"
          height="2.8"
          rx="0.5"
          className={cn("fill-background", index === 3 && ACCENT_STROKE)}
        />
      ))}
    </GlyphSvg>
  );
}

function GlyphReact() {
  return (
    <GlyphSvg>
      <WindowChrome />
      <rect
        {...motion("pop")}
        x="17"
        y="9.5"
        width="9.5"
        height="3"
        rx="1.5"
        className="fill-foreground/15 stroke-none"
      />
      <path {...motion("draw", 120)} pathLength={100} d="M6 11.5H13" />
      <path
        {...motion("draw", 200)}
        pathLength={100}
        d="M6 14H11"
        className={DIM}
      />
      <rect x="5.5" y="16.3" width="21" height="2.6" rx="1.3" className={DIM} />
      <circle
        {...motion("pop", 320)}
        cx="24.4"
        cy="17.6"
        r="0.85"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphNative() {
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

function GlyphInk() {
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

function GlyphCloud() {
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

function GlyphPlayground() {
  return (
    <GlyphSvg>
      <rect x="3" y="4" width="26" height="16" rx="2" className={DIM} />
      <path d="M16 4V20" className={FAINT} />
      <path {...motion("draw")} pathLength={100} d="M6 9H12.5" />
      <path
        {...motion("draw", 60)}
        pathLength={100}
        d="M7.5 12H13.5"
        className={DIM}
      />
      <path
        {...motion("draw", 120)}
        pathLength={100}
        d="M6 15H11"
        className={DIM}
      />
      <path
        {...motion("pop", 220)}
        d="M20.5 9.2L25.5 12L20.5 14.8Z"
        className={cn("fill-foreground/30 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

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
        className={cn("fill-foreground/35 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

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

function GlyphExamples() {
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

function GlyphChangelog() {
  const entries = [
    { y: 5, d: "M10 5H28", r: 2 },
    { y: 12, d: "M10 12H24", r: 1.6 },
    { y: 19, d: "M10 19H20", r: 1.6 },
  ];
  return (
    <GlyphSvg>
      <path
        {...motion("draw")}
        pathLength={100}
        d="M5 3V21"
        className="stroke-foreground/18"
      />
      {entries.map(({ y, d, r }, index) => (
        <g key={y}>
          <circle
            {...motion("pop", 50 + index * 150)}
            cx="5"
            cy={y}
            r={r}
            className={cn(
              "fill-foreground/30 stroke-none",
              index === 0 && ACCENT_FILL,
            )}
          />
          <path
            {...motion("draw", 120 + index * 150)}
            pathLength={100}
            d={d}
            className={DIM}
          />
        </g>
      ))}
    </GlyphSvg>
  );
}

function GlyphShowcase() {
  return (
    <GlyphSvg>
      <rect
        {...motion("shift", 0, {
          "--glyph-dx": "-2.5px",
          "--glyph-dy": "1.5px",
        })}
        x="11"
        y="3"
        width="17.5"
        height="12"
        rx="1.5"
        className={FAINT}
      />
      <g
        {...motion("shift", 0, {
          "--glyph-dx": "2.5px",
          "--glyph-dy": "-1.5px",
        })}
      >
        <rect
          x="3.5"
          y="8.5"
          width="17.5"
          height="12.5"
          rx="1.5"
          className="fill-background"
        />
        <path d="M3.5 12H21" className={FAINT} />
        <path d="M6 15.5H15" className={DIM} />
      </g>
      <path
        {...motion("spin", 250)}
        d="M26 15.5L26.9 17.6L29 18.5L26.9 19.4L26 21.5L25.1 19.4L23 18.5L25.1 17.6Z"
        className={cn("fill-foreground/40 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphOss() {
  return (
    <GlyphSvg>
      <path
        {...motion("shift", 0, { "--glyph-dx": "-2px", "--glyph-dy": "0px" })}
        d="M10.5 6.5L5 12L10.5 17.5"
      />
      <path
        {...motion("shift", 0, { "--glyph-dx": "2px", "--glyph-dy": "0px" })}
        d="M21.5 6.5L27 12L21.5 17.5"
      />
      <path
        {...motion("draw", 150)}
        pathLength={100}
        d="M18.5 4.5L13.5 19.5"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function Cube({
  x,
  y,
  className,
}: {
  x: number;
  y: number;
  className?: string;
}) {
  const s = 5;
  const h = s * 1.1;
  return (
    <>
      <path
        d={`M${x} ${y - s}L${x + s} ${y - s / 2}L${x} ${y}L${x - s} ${y - s / 2}Z`}
        className={cn("fill-foreground/10 [stroke-width:1]", className)}
      />
      <path
        d={`M${x - s} ${y - s / 2}L${x} ${y}V${y + h}L${x - s} ${y + h - s / 2}Z`}
        className="fill-foreground/5 [stroke-width:1]"
      />
      <path
        d={`M${x} ${y}L${x + s} ${y - s / 2}V${y + h - s / 2}L${x} ${y + h}Z`}
        className="fill-foreground/[0.02] [stroke-width:1]"
      />
    </>
  );
}

function GlyphPackages() {
  return (
    <GlyphSvg>
      <g {...motion("settle", 350)}>
        <Cube x={11.5} y={15.5} />
      </g>
      <g {...motion("settle", 400)}>
        <Cube x={20.5} y={15.5} />
      </g>
      <g {...motion("drop")}>
        <Cube
          x={16}
          y={8.6}
          className="transition-colors duration-200 group-hover/navlink:fill-blue-500 group-hover/navlink:stroke-blue-500"
        />
      </g>
    </GlyphSvg>
  );
}

function GlyphBlog() {
  return (
    <GlyphSvg>
      <path d="M9 3.5H19L24 8.5V20.5H9Z" className={DIM} />
      <path d="M19 3.5V8.5H24" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M11.5 11.5H19.5"
        className={cn("[stroke-width:1.6]", ACCENT_STROKE)}
      />
      <path
        {...motion("draw", 110)}
        pathLength={100}
        d="M11.5 14.75H21.5"
        className={DIM}
      />
      <path
        {...motion("draw", 180)}
        pathLength={100}
        d="M11.5 17.75H18"
        className={DIM}
      />
    </GlyphSvg>
  );
}

function GlyphCareers() {
  return (
    <GlyphSvg>
      <circle
        {...motion("bob")}
        cx="11"
        cy="8.5"
        r="2.6"
        className={cn("fill-foreground/30 stroke-none", ACCENT_FILL)}
      />
      <path d="M6.5 18.5a4.5 4.5 0 0 1 9 0" />
      <circle
        {...motion("bob", 140)}
        cx="19.5"
        cy="9.5"
        r="2.2"
        className="fill-foreground/20 stroke-none"
      />
      <path d="M15.6 18.5a3.9 3.9 0 0 1 7.8 0" className={DIM} />
      <path
        {...motion("spin", 280)}
        d="M27 5.5V9.5M25 7.5H29"
        className={ACCENT_STROKE}
      />
    </GlyphSvg>
  );
}

function GlyphBrand() {
  return (
    <GlyphSvg>
      <circle
        {...motion("shift", 0, { "--glyph-dx": "-12px", "--glyph-dy": "3px" })}
        cx="21.5"
        cy="10.5"
        r="6"
      />
      <rect
        {...motion("shift", 0, { "--glyph-dx": "12px", "--glyph-dy": "-3px" })}
        x="4"
        y="8"
        width="11"
        height="11"
        rx="2"
        className={cn("fill-foreground/25 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphTraction() {
  return (
    <GlyphSvg>
      <path
        {...motion("fade", 200)}
        d="M2 20L9 15.5L15 17L22 9.5L29.5 4V21H2Z"
        className="fill-foreground/[0.07] stroke-none"
      />
      <path d="M2 21H30" className={FAINT} />
      <path
        {...motion("draw")}
        pathLength={100}
        d="M2 20L9 15.5L15 17L22 9.5L29.5 4"
      />
      <circle
        {...motion("pop", 600)}
        cx="29.5"
        cy="4"
        r="1.7"
        className={cn("fill-foreground/45 stroke-none", ACCENT_FILL)}
      />
    </GlyphSvg>
  );
}

function GlyphStatus() {
  const beat = "M1 13H9.5L11.5 13L13.5 6L16 19.5L18.5 9.5L20 13H31";
  return (
    <GlyphSvg>
      <path d="M1 13H31" className={FAINT} />
      <path {...motion("draw")} pathLength={100} d={beat} />
      <path
        {...motion("blip", 300)}
        pathLength={100}
        d={beat}
        className="stroke-blue-500 [stroke-width:1.6]"
      />
    </GlyphSvg>
  );
}

const GLYPHS: Record<NavGlyphKind, () => ReactNode> = {
  elements: GlyphElements,
  design: GlyphDesign,
  react: GlyphReact,
  native: GlyphNative,
  ink: GlyphInk,
  cloud: GlyphCloud,
  playground: GlyphPlayground,
  shimmer: GlyphShimmer,
  heat: GlyphHeat,
  frame: GlyphFrame,
  o11y: GlyphO11y,
  examples: GlyphExamples,
  changelog: GlyphChangelog,
  showcase: GlyphShowcase,
  oss: GlyphOss,
  packages: GlyphPackages,
  traction: GlyphTraction,
  blog: GlyphBlog,
  careers: GlyphCareers,
  brand: GlyphBrand,
  status: GlyphStatus,
};

export function NavGlyph({
  kind,
  size = "sm",
}: {
  kind: NavGlyphKind;
  size?: "sm" | "lg";
}) {
  const Glyph = GLYPHS[kind];

  if (size === "lg") {
    return (
      <span className="border-foreground/10 bg-background group-hover/navlink:border-foreground/25 rounded-document [container-type:size] flex min-h-24 w-full flex-1 items-center justify-center border transition-colors">
        <span className="flex w-[min(56cqw,90cqh)] [&>svg]:h-auto [&>svg]:w-full [&>svg]:[stroke-width:0.5]">
          <Glyph />
        </span>
      </span>
    );
  }

  return (
    <span className="border-foreground/10 bg-background rounded-document grid size-11 shrink-0 place-items-center border">
      <Glyph />
    </span>
  );
}
