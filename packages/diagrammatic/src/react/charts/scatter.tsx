import type { BaseProps, Density } from "../svg";
import { forwardRef } from "react";
import type { Guide, Pt, ScaleKind, Tick } from "../../core/types";
import {
  extent,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type ScatterProps = BaseProps & {
  points: { x: number; y: number; size?: number; label?: string }[];
  trend?: boolean;
  xLabel?: string;
  yLabel?: string;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  xTicks?: readonly Tick[];
  yTicks?: readonly Tick[];
  guides?: readonly Guide[];
};

export function scatterFrame(
  points: Pt[],
  vh: number,
  density?: Density,
  extra?: {
    x?: readonly number[] | undefined;
    y?: readonly number[] | undefined;
    xScale?: ScaleKind;
    yScale?: ScaleKind;
  },
) {
  const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
    labels: true,
    ticks: true,
    left: density === "figure" ? 24 : 20,
  });
  const xScale = extra?.xScale ?? "linear";
  const yScale = extra?.yScale ?? "linear";
  const xValues = [...points.map((p) => p.x), ...(extra?.x ?? [])];
  const yValues = [...points.map((p) => p.y), ...(extra?.y ?? [])];
  const [xLo, xHi] =
    xScale === "log" ? positiveExtent(xValues) : extent(xValues);
  const [yLo, yHi] =
    yScale === "log" ? positiveExtent(yValues) : extent(yValues);
  return {
    X: project(xScale, xLo, xHi, left, right),
    Y: project(yScale, yLo, yHi, bottom, top),
    left,
    right,
    top,
    bottom,
    axisY,
    xScale,
    yScale,
  };
}

export const Scatter = forwardRef<SVGSVGElement, ScatterProps>(
  (
    {
      points,
      trend,
      xLabel,
      yLabel,
      xScale,
      yScale,
      xTicks,
      yTicks,
      guides,
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
    const {
      X,
      Y,
      left,
      right,
      top,
      bottom,
      axisY,
      xScale: xs,
      yScale: ys,
    } = scatterFrame(points, vh, density, {
      x: [
        ...(xTicks?.map((tick) => tick.at) ?? []),
        ...(guides?.filter((g) => g.axis === "x").map((g) => g.at) ?? []),
      ],
      y: [
        ...(yTicks?.map((tick) => tick.at) ?? []),
        ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
          []),
      ],
      ...(xScale ? { xScale } : {}),
      ...(yScale ? { yScale } : {}),
    });
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
        <Guides
          guides={guides}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        {trend && xs === "linear" && ys === "linear" && (
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
