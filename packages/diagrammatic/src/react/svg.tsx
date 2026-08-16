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
export type BaseProps = SvgAttributes & {
  title?: string;
  labels?: string[];
  legend?: boolean;
  format?: (value: number) => string;
  aspect?: number;
};

/** The micro charts drop axis and legend concerns but keep the svg surface. */
export type MicroBaseProps = SvgAttributes & {
  title?: string;
};

export const TXT = {
  axis: { fontSize: 4.5, fill: MUTED, fontFamily: FONT },
  label: { fontSize: 5, fill: ink(0.55), fontFamily: FONT },
  value: { fontSize: 5, fill: ink(0.75), fontFamily: FONT },
  onSeries: { fontSize: 4.5, fill: "#fff", opacity: 0.95, fontFamily: FONT },
} as const;

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
}: {
  names: string[];
  colors: string[];
  x?: number;
  y?: number;
  anchor?: "start" | "end";
}) {
  const widths = names.map((name) => 7.6 + name.length * 2.9 + 9);
  const total = widths.reduce((sum, w) => sum + w, 0) - 9;
  let cursor = anchor === "end" ? x - total : x;
  return (
    <g data-part="legend">
      {names.map((name, i) => {
        const x0 = cursor;
        cursor += widths[i]!;
        return (
          <g key={name}>
            <circle cx={x0 + 2.4} cy={y - 1.6} r="2.4" fill={colors[i]} />
            <text x={x0 + 7.6} y={y} {...TXT.axis}>
              {name}
            </text>
          </g>
        );
      })}
    </g>
  );
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
}: {
  labels: string[];
  xs: number[];
  y: number;
}) {
  return (
    <g data-part="axis">
      {labels.map((label, i) => (
        <text
          key={`${label}-${i}`}
          x={xs[i]}
          y={y}
          textAnchor="middle"
          {...TXT.axis}
        >
          {label}
        </text>
      ))}
    </g>
  );
}
