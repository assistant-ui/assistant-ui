import { round, stroke } from "../core/geometry";
import type { Guide, Tick } from "../core/types";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  forwardRef,
} from "react";
import { FONT, MUTED, ink } from "../core/theme";
import { textWidth, truncate } from "../core/text";

/**
 * The native surface charts pass through. `children` is owned by the chart;
 * `points`, `values`, `origin`, `fill`, `display`, `target`, and `format`
 * collide with chart data props and mean nothing on an svg root; `width`,
 * `height`, and `fontSize` are chart props with a numeric contract.
 */
type SvgAttributes = Omit<
  ComponentPropsWithoutRef<"svg">,
  | "children"
  | "points"
  | "values"
  | "origin"
  | "fill"
  | "display"
  | "target"
  | "format"
  | "width"
  | "height"
  | "fontSize"
>;

/** The width a figure renders at when the host states none, in CSS pixels. */
export const DEFAULT_WIDTH = 640;

/** The type size every figure starts from, in CSS pixels. */
export const DEFAULT_FONT_SIZE = 11;

/** The band a type size is held to, so an untrusted spec cannot print type taller than its own frame. */
export const FONT_SIZE_RANGE: readonly [number, number] = [6, 48];

/** Space between the frame edge and anything drawn, in pixels. */
export const PAD = 8;

/**
 * The contract every chart accepts, on top of the native svg surface: every
 * svg attribute, aria-*, data-*, and event handler passes through to the root
 * element, and a passed `style` merges over the defaults. `title` names the
 * chart for assistive technology; without it (or an explicit aria-label) the
 * SVG renders as decorative. `labels` are the category or tick labels along
 * the primary axis. `legend` defaults to automatic: shown when two or more
 * series are present. `format` renders numbers wherever the chart prints one.
 *
 * A figure is drawn in CSS pixels: `width` and `height` are its rendered
 * size, `fontSize` is its type size, and margins, hairlines and marks are all
 * pixel measures, so a chart sits on the same scale as the page around it.
 * The host contract is `docs/host.md`.
 */
export type BaseProps = SvgAttributes & {
  title?: string;
  summary?: string;
  labels?: string[];
  legend?: boolean;
  format?: (value: number) => string;
  /** Rendered width in CSS pixels. Defaults to {@link DEFAULT_WIDTH}; a narrower host shrinks the figure, a wider one does not stretch it. */
  width?: number;
  /** Rendered height in CSS pixels. Defaults to `width / aspect`. */
  height?: number;
  /** Width over height, the shape knob when `height` is not given. Each form has its own default. */
  aspect?: number;
  /** The type size in CSS pixels. Every printed role and the frame allowances that hold it follow this one number. Defaults to {@link DEFAULT_FONT_SIZE}. */
  fontSize?: number;
  view?: View;
};

/**
 * A window onto the figure, in fractions of the box: `{ x: 0, y: 0, w: 1, h: 1 }`
 * is the whole thing and `w: 0.5` is twice the magnification. Seeing a figure
 * through a window keeps hairlines and type at their drawn size, which
 * scaling the rendered element cannot do.
 */
export type View = { x: number; y: number; w: number; h: number };

/** The micro charts drop axis and legend concerns but keep the svg surface. */
export type MicroBaseProps = SvgAttributes & {
  title?: string;
  summary?: string;
  /** Break out of the inline em box and fill the host, for a full-width row. */
  block?: boolean;
  width?: number;
  height?: number;
};

/**
 * One printed role. `px` is the rendered size for layout and measurement;
 * `attrs` is what the text element carries. Sizes on the element are em of
 * the root, so a host stylesheet that sets the root's font-size moves every
 * role with it.
 */
export type TypeRole = {
  px: number;
  attrs: { fontSize?: string; fill: string; opacity?: number };
};

export type TypeScale = {
  base: number;
  axis: TypeRole;
  label: TypeRole;
  value: TypeRole;
  onSeries: TypeRole;
};

const LARGE = 1.1;

const sized = (value: number | undefined): number | undefined =>
  value !== undefined && Number.isFinite(value) && value > 0
    ? value
    : undefined;

export function resolveFontSize(fontSize: number | undefined): number {
  const wanted = sized(fontSize);
  if (wanted === undefined) return DEFAULT_FONT_SIZE;
  return Math.max(FONT_SIZE_RANGE[0], Math.min(FONT_SIZE_RANGE[1], wanted));
}

export function resolveWidth(width: number | undefined): number {
  return sized(width) ?? DEFAULT_WIDTH;
}

/**
 * The four roles a chart prints, derived from one size. Axis and on-series
 * text sit at the base; labels and values step up a tenth so a printed number
 * reads over the ticks around it.
 */
export function typeScale(fontSize?: number): TypeScale {
  const base = resolveFontSize(fontSize);
  const large = Math.round(base * LARGE * 100) / 100;
  return {
    base,
    axis: { px: base, attrs: { fill: MUTED } },
    label: { px: large, attrs: { fontSize: `${LARGE}em`, fill: ink(0.55) } },
    value: { px: large, attrs: { fontSize: `${LARGE}em`, fill: ink(0.75) } },
    onSeries: { px: base, attrs: { fill: "#fff", opacity: 0.95 } },
  };
}

/**
 * A printed size that is not one of the four roles: a pie's centre number, a
 * gauge's nameplate. Expressed as a multiple of the base so it answers to the
 * same knob; returns the pixel size for layout and the em string to print.
 */
export function typeSize(
  T: TypeScale,
  factor: number,
): { px: number; fontSize: string } {
  const f = Math.max(0.5, factor);
  return {
    px: Math.round(T.base * f * 100) / 100,
    fontSize: `${Math.round(f * 1000) / 1000}em`,
  };
}

export type SizeProps = {
  width?: number | undefined;
  height?: number | undefined;
  aspect?: number | undefined;
  fontSize?: number | undefined;
};

export type FrameOptions = {
  legend?: boolean | undefined;
  /** Category labels or tick labels printed along the bottom edge. */
  labels?: boolean | undefined;
  /** Value-axis ticks printed down the left edge. The labels size the gutter; `true` reserves a default one. */
  ticks?: readonly Tick[] | boolean | undefined;
  left?: number | undefined;
  right?: number | undefined;
  top?: number | undefined;
  bottom?: number | undefined;
};

/**
 * The rendered box and the plot rectangle inside it, in CSS pixels. `left`,
 * `right`, `top` and `bottom` are the plot's edges; `axisY` is the baseline
 * of the labels along the bottom edge and `legendY` the baseline of the
 * legend row along the top. `T` is the type scale the frame was sized for.
 */
export type Frame = {
  width: number;
  height: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  axisY: number;
  legendY: number;
  T: TypeScale;
};

/**
 * Sizes the frame from the host's size props and the type it holds. Every
 * allowance is a pixel measure derived from the type size, so a larger
 * `fontSize` grows the margins that hold it and nothing is drawn outside the
 * box. A chart with its own gutter (row labels down the left, end labels on
 * the right) passes the edge it computed.
 */
export function frame(
  props: SizeProps,
  fallbackAspect: number,
  opts: FrameOptions = {},
): Frame {
  const width = resolveWidth(props.width);
  const aspect = sized(props.aspect) ?? fallbackAspect;
  const height =
    sized(props.height) ?? Math.round((width / aspect) * 100) / 100;
  const T = typeScale(props.fontSize);
  const axis = T.axis.px;
  const edge = opts.labels ? PAD + Math.round(axis * 1.2) : PAD;
  const gutter =
    opts.ticks === undefined || opts.ticks === false
      ? edge
      : opts.ticks === true
        ? PAD + Math.round(axis * 3) + 6
        : PAD +
          Math.ceil(
            Math.max(
              0,
              ...opts.ticks.map((tick) => textWidth(tick.label, axis)),
            ),
          ) +
          6;
  const legendY = PAD + axis;
  const left = opts.left ?? Math.max(edge, gutter);
  const right = opts.right ?? width - edge;
  const top =
    opts.top ??
    (opts.legend ? legendY + T.value.px + 10 : PAD + T.value.px + 2);
  const axisY = height - PAD;
  const bottom = opts.bottom ?? (opts.labels ? axisY - axis - 6 : height - PAD);
  return { width, height, left, right, top, bottom, axisY, legendY, T };
}

const ROOT: CSSProperties = {
  display: "block",
  maxWidth: "100%",
  height: "auto",
  fontFamily: FONT,
  fontVariantNumeric: "tabular-nums",
};

/** The window the figure is seen through, defaulting to the whole box. */
function viewBox(view: View | undefined, F: Frame): string {
  if (!view) return `0 0 ${F.width} ${F.height}`;
  const w = Math.max(0.001, view.w) * F.width;
  const h = Math.max(0.001, view.h) * F.height;
  return `${round(view.x * F.width)} ${round(view.y * F.height)} ${round(w)} ${round(h)}`;
}

/**
 * Charts forward their unconsumed rest here, so the root also swallows the
 * BaseProps-only keys a chart may not read (a `format` on a chart with no
 * printed numbers, `labels` on an unlabeled form). Left in `rest`, they would
 * land on the svg element as attributes, and a function prop breaks RSC
 * serialization.
 */
type FrameProps = SvgAttributes & {
  frame: Frame;
  title?: string | undefined;
  summary?: string | undefined;
  view?: View | undefined;
  labels?: string[] | undefined;
  legend?: boolean | undefined;
  format?: ((value: number) => string) | undefined;
  width?: number | undefined;
  height?: number | undefined;
  aspect?: number | undefined;
  fontSize?: number | undefined;
  xScale?: unknown;
  yScale?: unknown;
  xs?: unknown;
  guides?: unknown;
  children: ReactNode;
};

/**
 * The root every figure renders into: sized in CSS pixels, typed at the
 * frame's base size so every text role inherits it, and held to the host's
 * width with `max-width: 100%` so a narrower host shrinks the figure whole.
 */
export const ChartSvg = forwardRef<SVGSVGElement, FrameProps>(
  (
    {
      frame: F,
      title,
      summary,
      view,
      style,
      children,
      labels: _labels,
      legend: _legend,
      format: _format,
      width: _width,
      height: _height,
      aspect: _aspect,
      fontSize: _fontSize,
      xScale: _xScale,
      yScale: _yScale,
      xs: _xs,
      guides: _guides,
      ...rest
    },
    ref,
  ) => {
    const label = title ?? rest["aria-label"];
    return (
      <svg
        ref={ref}
        viewBox={viewBox(view, F)}
        width={F.width}
        height={F.height}
        fontSize={F.T.base}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        data-dg=""
        {...rest}
        style={{ ...ROOT, ...style }}
      >
        {title ? <title>{title}</title> : null}
        {summary ? <desc>{summary}</desc> : null}
        {children}
      </svg>
    );
  },
);

ChartSvg.displayName = "ChartSvg";

/**
 * Inline micro chart frame: one line of text tall, sized in em so it sits
 * inside table cells and sentences without layout work.
 */
export const MicroSvg = forwardRef<
  SVGSVGElement,
  Omit<FrameProps, "frame"> & {
    vw: number;
    vh: number;
    em: number;
    block?: boolean | undefined;
  }
>(
  (
    {
      vw,
      vh,
      em,
      title,
      summary,
      block,
      width,
      height,
      view: _view,
      style,
      children,
      labels: _labels,
      legend: _legend,
      format: _format,
      aspect: _aspect,
      fontSize: _fontSize,
      xScale: _xScale,
      yScale: _yScale,
      xs: _xs,
      guides: _guides,
      ...rest
    },
    ref,
  ) => {
    const label = title ?? rest["aria-label"];
    const px = sized(width);
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${vw} ${vh}`}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        data-dg=""
        preserveAspectRatio={block ? "none" : undefined}
        {...rest}
        width={px}
        height={
          height ??
          (px === undefined
            ? undefined
            : Math.round(((px * vh) / vw) * 100) / 100)
        }
        style={
          block
            ? {
                display: "block",
                width: "100%",
                height: `${em}em`,
                fontFamily: FONT,
                ...style,
              }
            : px === undefined
              ? {
                  display: "inline-block",
                  height: `${em}em`,
                  width: "auto",
                  verticalAlign: "-0.125em",
                  fontFamily: FONT,
                  ...style,
                }
              : {
                  display: "inline-block",
                  verticalAlign: "-0.125em",
                  fontFamily: FONT,
                  ...style,
                }
        }
      >
        {title ? <title>{title}</title> : null}
        {summary ? <desc>{summary}</desc> : null}
        {children}
      </svg>
    );
  },
);

MicroSvg.displayName = "MicroSvg";

/**
 * The legend drawn inside the figure: one row along the top edge, names cut
 * to hold the frame. A host that wants a legend on the page's own type uses
 * `legend={false}` and the DOM `Legend` export instead.
 */
export function SvgLegend({
  frame: F,
  names,
  colors,
  x = PAD,
  y = F.legendY,
  anchor = "start",
  type = F.T.axis,
  fit = F.width - PAD,
}: {
  frame: Frame;
  names: string[];
  colors: string[];
  x?: number;
  y?: number;
  anchor?: "start" | "end";
  type?: TypeRole;
  /** The edge the row may not cross; names are cut to hold it. */
  fit?: number;
}) {
  const em = type.px;
  const swatch = Math.round(em * 0.36 * 100) / 100;
  const gap = Math.round(em * 0.5 * 100) / 100;
  const pad = Math.round(em * 1.4 * 100) / 100;
  const chrome = swatch * 2 + gap + pad;
  const available = Math.max(0, anchor === "end" ? x - PAD : fit - x);
  const natural = names.reduce(
    (sum, name) => sum + chrome + textWidth(name, em),
    0,
  );
  const budget = names.length > 0 ? available / names.length - chrome : 0;
  const shown =
    natural <= available ? names : names.map((n) => truncate(n, em, budget));
  const widths = shown.map((name) => chrome + textWidth(name, em));
  const total = widths.reduce((sum, w) => sum + w, 0);
  let cursor = anchor === "end" ? x - total : x;
  return (
    <g data-part="legend">
      {shown.map((name, i) => {
        const x0 = cursor;
        cursor += widths[i]!;
        return (
          <g key={`${name}-${i}`}>
            <circle
              cx={round(x0 + swatch)}
              cy={round(y - em * 0.35)}
              r={swatch}
              fill={colors[i]}
            />
            <text x={round(x0 + swatch * 2 + gap)} y={y} {...type.attrs}>
              {name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

export function TickGrid({
  ticks,
  at,
  from,
  to,
  type,
  axis = "y",
  labelAt,
}: {
  ticks?: readonly Tick[] | undefined;
  at: (value: number) => number;
  from: number;
  to: number;
  type: TypeRole;
  axis?: "y" | "x";
  labelAt?: number;
}) {
  if (!ticks?.length) return null;
  const across = axis === "y";
  return ticks.map((tick) => {
    const p = round(at(tick.at));
    return (
      <g key={`${axis}-${tick.at}`} data-part="grid">
        <line
          x1={across ? from : p}
          y1={across ? p : from}
          x2={across ? to : p}
          y2={across ? p : to}
          stroke={ink(0.16)}
          strokeDasharray="2 3"
          {...stroke.hair}
        />
        <text
          x={across ? from - 6 : p}
          y={across ? p : (labelAt ?? to + type.px + 4)}
          textAnchor={across ? "end" : "middle"}
          dominantBaseline={across ? "central" : undefined}
          {...type.attrs}
        >
          {tick.label}
        </text>
      </g>
    );
  });
}

/**
 * Tick positions for an axis: one per point when counts match, otherwise the
 * labels spread evenly across the plotted span (sparse-tick convention).
 */
export function labelXs(pointXs: number[], count: number): number[] {
  if (count === pointXs.length) return pointXs;
  const lo = pointXs[0] ?? 0;
  const hi = pointXs[pointXs.length - 1] ?? lo;
  return Array.from(
    { length: count },
    (_, i) => lo + ((hi - lo) * i) / Math.max(1, count - 1),
  );
}

export function AxisLabels({
  labels,
  xs,
  y,
  vertical,
  type,
}: {
  labels: string[];
  xs: number[];
  y: number;
  vertical?: boolean;
  type: TypeRole;
}) {
  return (
    <g data-part="axis">
      {labels.map((label, i) =>
        vertical ? (
          <text
            key={`${label}-${i}`}
            x={round(xs[i] ?? 0)}
            y={y}
            transform={`rotate(90 ${round(xs[i] ?? 0)} ${y})`}
            textAnchor="start"
            dominantBaseline="central"
            {...type.attrs}
          >
            {label}
          </text>
        ) : (
          <text
            key={`${label}-${i}`}
            x={round(xs[i] ?? 0)}
            y={y}
            textAnchor="middle"
            {...type.attrs}
          >
            {label}
          </text>
        ),
      )}
    </g>
  );
}

/** Reference lines with an optional printed label, across either axis. */
export function Guides({
  guides,
  X,
  Y,
  left,
  right,
  top,
  bottom,
  type,
}: {
  guides?: readonly Guide[] | undefined;
  X: (value: number) => number;
  Y: (value: number) => number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  type: TypeRole;
}) {
  if (!guides?.length) return null;
  return (
    <g>
      {guides.map((guide, i) => {
        const axis = guide.axis ?? "y";
        if (axis === "y") {
          const y = round(Y(guide.at));
          return (
            <g
              key={`guide-y-${guide.at}-${i}`}
              data-part="guide"
              data-series={guide.label}
            >
              <line
                x1={left}
                y1={y}
                x2={right}
                y2={y}
                stroke={ink(0.45)}
                strokeDasharray="3 4"
                {...stroke.hair}
              />
              {guide.label ? (
                <text
                  x={right}
                  y={y - 4}
                  textAnchor="end"
                  {...type.attrs}
                  fill={ink(0.8)}
                >
                  {guide.label}
                </text>
              ) : null}
            </g>
          );
        }
        const x = round(X(guide.at));
        return (
          <g
            key={`guide-x-${guide.at}-${i}`}
            data-part="guide"
            data-series={guide.label}
          >
            <line
              x1={x}
              y1={top}
              x2={x}
              y2={bottom}
              stroke={ink(0.45)}
              strokeDasharray="3 4"
              {...stroke.hair}
            />
            {guide.label ? (
              <text
                x={x}
                y={top - 4}
                textAnchor="middle"
                {...type.attrs}
                fill={ink(0.8)}
              >
                {guide.label}
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/**
 * A row of transparent full-height hit rects for charts whose marks are
 * continuous paths: one column per data index, split at the midpoints
 * between evenly spaced points, so the pointer always resolves to a datum.
 */
export function ColumnHits({
  count,
  x0,
  x1,
  top,
  bottom,
}: {
  count: number;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}) {
  if (count < 1) return null;
  const step = count === 1 ? x1 - x0 : (x1 - x0) / (count - 1);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const left = i === 0 ? x0 : x0 + step * (i - 0.5);
        const right = i === count - 1 ? x1 : x0 + step * (i + 0.5);
        return (
          <rect
            key={i}
            x={round(left)}
            y={round(top)}
            width={round(right - left)}
            height={round(bottom - top)}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        );
      })}
    </g>
  );
}

/** The radius of an invisible hit pad over a point, wide enough to hover and never wider than half the gap to its neighbour. */
export function hitRadius(span: number, count: number): number {
  return (
    Math.round(Math.max(4, Math.min(12, span / Math.max(1, count) / 2)) * 100) /
    100
  );
}
