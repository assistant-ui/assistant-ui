import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Pt } from "../../core/types";
import { extent, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type ScatterProps = BaseProps & {
  points: { x: number; y: number; size?: number; label?: string }[];
  trend?: boolean;
  xLabel?: string;
  yLabel?: string;
  xTicks?: readonly { at: number; label: string }[];
  yTicks?: readonly { at: number; label: string }[];
};

export function scatterFrame(
  points: Pt[],
  vh: number,
): { X: (v: number) => number; Y: (v: number) => number; bottom: number } {
  const bottom = vh - 18;
  const [xLo, xHi] = extent(points.map((p) => p.x));
  const [yLo, yHi] = extent(points.map((p) => p.y));
  const xSpan = xHi - xLo || 1;
  const ySpan = yHi - yLo || 1;
  return {
    X: (v) => 20 + ((v - xLo) / xSpan) * 160,
    Y: (v) => bottom - 6 - ((v - yLo) / ySpan) * (bottom - 24),
    bottom,
  };
}

export const Scatter = forwardRef<SVGSVGElement, ScatterProps>(
  (
    {
      points,
      trend,
      xLabel,
      yLabel,
      xTicks,
      yTicks,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const { X, Y, bottom } = scatterFrame(points, vh);
    const sized = points.some((p) => p.size !== undefined);
    const maxSize = Math.max(...points.map((p) => p.size ?? 0), 1);
    const n = points.length || 1;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    const slope =
      points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) /
      (points.reduce((s, p) => s + (p.x - mx) ** 2, 0) || 1);
    const [xLo, xHi] = extent(points.map((p) => p.x));
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {yTicks?.map((tick) => (
          <g key={`y-${tick.at}`} data-part="grid">
            <line
              x1="14"
              y1={round(Y(tick.at))}
              x2="186"
              y2={round(Y(tick.at))}
              stroke={GRID}
              {...stroke.hair}
            />
            <text
              x="12"
              y={round(Y(tick.at)) + 1.5}
              textAnchor="end"
              {...TXT.axis}
            >
              {tick.label}
            </text>
          </g>
        ))}
        {xTicks?.map((tick) => (
          <g key={`x-${tick.at}`} data-part="grid">
            <line
              x1={round(X(tick.at))}
              y1="8"
              x2={round(X(tick.at))}
              y2={bottom}
              stroke={GRID}
              {...stroke.hair}
            />
            <text
              x={round(X(tick.at))}
              y={bottom + 6}
              textAnchor="middle"
              {...TXT.axis}
            >
              {tick.label}
            </text>
          </g>
        ))}
        <line
          x1="14"
          y1={bottom}
          x2="186"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1="14"
          y1={bottom}
          x2="14"
          y2="8"
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {trend && (
          <line
            x1={round(X(xLo))}
            y1={round(Y(my + slope * (xLo - mx)))}
            x2={round(X(xHi))}
            y2={round(Y(my + slope * (xHi - mx)))}
            stroke={ACCENT}
            strokeDasharray="4 4"
            opacity="0.7"
            {...stroke.hair}
          />
        )}
        {points.map((p, i) =>
          sized ? (
            <circle
              key={i}
              cx={round(X(p.x))}
              cy={round(Y(p.y))}
              r={round(3 + Math.sqrt((p.size ?? 0) / maxSize) * 12)}
              fill={ACCENT}
              fillOpacity="0.18"
              stroke={ACCENT}
              strokeOpacity="0.75"
              data-part="mark"
              data-i={i}
              {...stroke.medium}
            />
          ) : (
            <circle
              key={i}
              cx={round(X(p.x))}
              cy={round(Y(p.y))}
              r="3"
              fill={ink(0.5)}
              data-part="mark"
              data-i={i}
            />
          ),
        )}
        {yLabel && (
          <text
            x="4"
            y={vh / 2 - 6}
            transform={`rotate(-90 4 ${vh / 2 - 6})`}
            textAnchor="middle"
            {...TXT.axis}
          >
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text x="100" y={vh - 3} textAnchor="middle" {...TXT.axis}>
            {xLabel} →{sized ? " · size = value" : ""}
          </text>
        )}
      </ChartSvg>
    );
  },
);

Scatter.displayName = "Scatter";
