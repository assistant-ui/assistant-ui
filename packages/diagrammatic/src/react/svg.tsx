import { round, stroke } from "../core/geometry";
import type { Tick } from "../core/types";
import {
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ReactNode,
  forwardRef,
} from "react";
import { FONT, MUTED, ink } from "../core/theme";

/**
 * The native surface charts pass through. `children` is owned by the chart;
 * `points`, `values`, `origin`, `fill`, `display`, `target`, and `format` are
 * dropped because they collide with chart data props and mean nothing on an
 * svg root (use `style` for presentation).
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
>;

/**
 * The contract every chart accepts, on top of the native svg surface: every
 * svg attribute, aria-*, data-*, and event handler passes through to the root
 * element, and a passed `style` merges over the defaults. `title` names the
 * chart for assistive technology; without it (or an explicit aria-label) the
 * SVG renders as decorative. `labels` are the category or tick labels along
 * the primary axis. `legend` defaults to automatic: shown when two or more
 * series are present. `format` renders numbers wherever the chart prints one.
 */
export type Density = "compact" | "figure";

export type BaseProps = SvgAttributes & {
  title?: string;
  labels?: string[];
  legend?: boolean;
  format?: (value: number) => string;
  aspect?: number;
  density?: Density;
};

/** The micro charts drop axis and legend concerns but keep the svg surface. */
export type MicroBaseProps = SvgAttributes & {
  title?: string;
};

type TypeStyle = {
  fontSize: number;
  fill: string;
  fontFamily: string;
  opacity?: number;
};

export const TXT: {
  axis: TypeStyle;
  label: TypeStyle;
  value: TypeStyle;
  onSeries: TypeStyle;
} = {
  axis: { fontSize: 3.2, fill: MUTED, fontFamily: FONT },
  label: { fontSize: 3.6, fill: ink(0.55), fontFamily: FONT },
  value: { fontSize: 3.6, fill: ink(0.75), fontFamily: FONT },
  onSeries: { fontSize: 3.2, fill: "#fff", opacity: 0.95, fontFamily: FONT },
};

export function typeScale(density?: Density) {
  if (density === "figure") {
    return {
      axis: { ...TXT.axis, fontSize: 3.6 },
      label: { ...TXT.label, fontSize: 3.8 },
      value: { ...TXT.value, fontSize: 4 },
      onSeries: { ...TXT.onSeries, fontSize: 3.4 },
    };
  }
  return TXT;
}

export function plotFrame(
  vh: number,
  density: Density | undefined,
  opts: {
    legend?: boolean;
    labels?: boolean;
    ticks?: boolean;
    left?: number;
  } = {},
) {
  const fig = density === "figure";
  const left = opts.left ?? (fig || opts.ticks ? 22 : 14);
  const right = fig ? 190 : 186;
  const top = opts.legend ? (fig ? 26 : 22) : fig ? 16 : 12;
  const bottom = opts.labels ? vh - (fig ? 20 : 16) : vh - (fig ? 12 : 8);
  return {
    left,
    right,
    top,
    bottom,
    fig,
    axisY: vh - (fig ? 6 : 4),
  };
}

const BLOCK: CSSProperties = {
  display: "block",
  width: "100%",
  height: "auto",
};

export function vbHeight(aspect: number | undefined, fallback: number): number {
  return Math.round((200 / (aspect ?? fallback)) * 100) / 100;
}

/**
 * Charts forward their unconsumed rest here, so the frame also swallows the
 * BaseProps-only keys a chart may not read (a `format` on a chart with no
 * printed numbers, `labels` on an unlabeled form). Left in `rest`, they would
 * land on the svg element as attributes, and a function prop breaks RSC
 * serialization.
 */
type FrameProps = SvgAttributes & {
  title?: string | undefined;
  labels?: string[] | undefined;
  legend?: boolean | undefined;
  format?: ((value: number) => string) | undefined;
  aspect?: number | undefined;
  density?: Density | undefined;
  children: ReactNode;
};

export const ChartSvg = forwardRef<SVGSVGElement, FrameProps & { vh: number }>(
  (
    {
      vh,
      title,
      style,
      children,
      labels: _labels,
      legend: _legend,
      format: _format,
      aspect: _aspect,
      density,
      ...rest
    },
    ref,
  ) => {
    const label = title ?? rest["aria-label"];
    return (
      <svg
        ref={ref}
        viewBox={`0 0 200 ${vh}`}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        data-dg=""
        data-density={density}
        {...rest}
        style={{ ...BLOCK, ...style }}
      >
        {title ? <title>{title}</title> : null}
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
  FrameProps & { vw: number; vh: number; em: number }
>(
  (
    {
      vw,
      vh,
      em,
      title,
      style,
      children,
      labels: _labels,
      legend: _legend,
      format: _format,
      aspect: _aspect,
      density: _density,
      ...rest
    },
    ref,
  ) => {
    const label = title ?? rest["aria-label"];
    return (
      <svg
        ref={ref}
        viewBox={`0 0 ${vw} ${vh}`}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        data-dg=""
        {...rest}
        style={{
          display: "inline-block",
          height: `${em}em`,
          width: "auto",
          verticalAlign: "-0.125em",
          ...style,
        }}
      >
        {title ? <title>{title}</title> : null}
        {children}
      </svg>
    );
  },
);

MicroSvg.displayName = "MicroSvg";

export function Legend({
  names,
  colors,
  x = 12,
  y = 11,
  anchor = "start",
  type = TXT.axis,
}: {
  names: string[];
  colors: string[];
  x?: number;
  y?: number;
  anchor?: "start" | "end";
  type?: TypeStyle;
}) {
  const em = type.fontSize;
  const swatch = em * 0.55;
  const gap = em * 0.5;
  const pad = em * 1.35;
  const widths = names.map(
    (name) => swatch * 2 + gap + name.length * em * 0.62 + pad,
  );
  const total = widths.reduce((sum, w) => sum + w, 0);
  let cursor = anchor === "end" ? x - total : x;
  return (
    <g data-part="legend">
      {names.map((name, i) => {
        const x0 = cursor;
        cursor += widths[i]!;
        return (
          <g key={name}>
            <circle
              cx={x0 + swatch}
              cy={y - em * 0.35}
              r={swatch}
              fill={colors[i]}
            />
            <text x={x0 + swatch * 2 + gap} y={y} {...type}>
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
  type = TXT.axis,
  axis = "y",
  labelAt,
}: {
  ticks?: readonly Tick[] | undefined;
  at: (value: number) => number;
  from: number;
  to: number;
  type?: TypeStyle;
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
          strokeDasharray="1.8 2.4"
          {...stroke.hair}
        />
        <text
          x={across ? from - 2 : p}
          y={across ? p + 1.2 : (labelAt ?? to + 6)}
          textAnchor={across ? "end" : "middle"}
          {...type}
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
  type = TXT.axis,
}: {
  labels: string[];
  xs: number[];
  y: number;
  vertical?: boolean;
  type?: TypeStyle;
}) {
  return (
    <g data-part="axis">
      {labels.map((label, i) =>
        vertical ? (
          <text
            key={`${label}-${i}`}
            x={xs[i]}
            y={y}
            transform={`rotate(90 ${xs[i]} ${y})`}
            textAnchor="start"
            dominantBaseline="central"
            {...type}
          >
            {label}
          </text>
        ) : (
          <text
            key={`${label}-${i}`}
            x={xs[i]}
            y={y}
            textAnchor="middle"
            {...type}
          >
            {label}
          </text>
        ),
      )}
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
