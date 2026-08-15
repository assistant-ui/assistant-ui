import type { CSSProperties, ReactNode } from "react";
import { FONT, MUTED, ink } from "../core/theme";

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

export function ChartSvg({
  vh,
  title,
  className,
  children,
}: {
  vh: number;
  title?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 200 ${vh}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={BLOCK}
      data-dg=""
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/**
 * Inline micro chart frame: one line of text tall, sized in em so it sits
 * inside table cells and sentences without layout work.
 */
export function MicroSvg({
  vw,
  vh,
  em,
  title,
  className,
  children,
}: {
  vw: number;
  vh: number;
  em: number;
  title?: string | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
      style={{
        display: "inline-block",
        height: `${em}em`,
        width: "auto",
        verticalAlign: "-0.125em",
      }}
      data-dg=""
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

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
