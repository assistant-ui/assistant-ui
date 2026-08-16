import type { BaseProps, Density } from "../svg";
import { forwardRef } from "react";
import type { Pt, Tick } from "../../core/types";
import { extent, linear, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TickGrid, plotFrame, typeScale, vbHeight } from "../svg";

export type ScatterProps = BaseProps & {
  points: { x: number; y: number; size?: number; label?: string }[];
  trend?: boolean;
  xLabel?: string;
  yLabel?: string;
  xTicks?: readonly Tick[];
  yTicks?: readonly Tick[];
};

export function scatterFrame(
  points: Pt[],
  vh: number,
  density?: Density,
  extra?: {
    x?: readonly number[] | undefined;
    y?: readonly number[] | undefined;
  },
) {
  const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
    labels: true,
    ticks: true,
    left: density === "figure" ? 24 : 20,
  });
  const [xLo, xHi] = extent([...points.map((p) => p.x), ...(extra?.x ?? [])]);
  const [yLo, yHi] = extent([...points.map((p) => p.y), ...(extra?.y ?? [])]);
  return {
    X: linear(xLo, xHi, left, right),
    Y: linear(yLo, yHi, bottom, top),
    left,
    right,
    top,
    bottom,
    axisY,
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
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const { X, Y, left, right, top, bottom, axisY } = scatterFrame(
      points,
      vh,
      density,
      {
        x: xTicks?.map((tick) => tick.at),
        y: yTicks?.map((tick) => tick.at),
      },
    );
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
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <TickGrid ticks={yTicks} at={Y} from={left} to={right} type={T.axis} />
        <TickGrid
          ticks={xTicks}
          at={X}
          from={top}
          to={bottom}
          axis="x"
          labelAt={axisY}
          type={T.axis}
        />
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <line
          x1={left}
          y1={bottom}
          x2={left}
          y2={top}
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
            {...T.axis}
          >
            {yLabel}
          </text>
        )}
        {xLabel && (
          <text x="100" y={axisY} textAnchor="middle" {...T.axis}>
            {xLabel} →{sized ? " · size = value" : ""}
          </text>
        )}
      </ChartSvg>
    );
  },
);

Scatter.displayName = "Scatter";
