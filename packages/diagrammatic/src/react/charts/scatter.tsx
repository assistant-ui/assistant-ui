import type { BaseProps, Frame } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { type TickSpec, resolveTicks, tickValues } from "../../core/scale";
import type { Guide, Pt, ScaleKind } from "../../core/types";
import {
  extent,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { ChartSvg, Guides, SvgLegend, TickGrid, frame } from "../svg";
import { truncate } from "../../core/text";

export type ScatterProps = BaseProps & {
  points: {
    x: number;
    y: number;
    size?: number;
    label?: string;
    /** Category of the point, colored and legended in order of appearance. */
    series?: string;
  }[];
  trend?: boolean;
  xLabel?: string;
  yLabel?: string;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  xTicks?: TickSpec;
  yTicks?: TickSpec;
  guides?: readonly Guide[];
};

type ScatterExtra = {
  x?: readonly number[] | undefined;
  y?: readonly number[] | undefined;
  xScale?: ScaleKind;
  yScale?: ScaleKind;
};

export function scatterDomain(points: Pt[], extra: ScatterExtra = {}) {
  const xScale = extra.xScale ?? "linear";
  const yScale = extra.yScale ?? "linear";
  const xValues = [...points.map((p) => p.x), ...(extra.x ?? [])];
  const yValues = [...points.map((p) => p.y), ...(extra.y ?? [])];
  const [xLo, xHi] =
    xScale === "log" ? positiveExtent(xValues) : extent(xValues);
  const [yLo, yHi] =
    yScale === "log" ? positiveExtent(yValues) : extent(yValues);
  return { xScale, yScale, xLo, xHi, yLo, yHi };
}

export function scatterFrame(
  F: Frame,
  { xScale, yScale, xLo, xHi, yLo, yHi }: ReturnType<typeof scatterDomain>,
) {
  const { left, right, top, bottom, axisY } = F;
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
    xLo,
    xHi,
    yLo,
    yHi,
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
      legend,
      format = formatCompact,
      title,
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const names = [
      ...new Set(
        points
          .map((p) => p.series)
          .filter((name): name is string => name !== undefined),
      ),
    ];
    const showLegend = legend ?? names.length > 1;
    const colorOf = (name: string | undefined, fallback: string) =>
      name === undefined ? fallback : cat(names.indexOf(name));
    const domain = scatterDomain(points, {
      x: [
        ...tickValues(xTicks),
        ...(guides?.filter((g) => g.axis === "x").map((g) => g.at) ?? []),
      ],
      y: [
        ...tickValues(yTicks),
        ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
          []),
      ],
      ...(xScale ? { xScale } : {}),
      ...(yScale ? { yScale } : {}),
    });
    const yTickList = resolveTicks(
      yTicks,
      domain.yLo,
      domain.yHi,
      domain.yScale,
      format,
    );
    const xTickList = resolveTicks(
      xTicks,
      domain.xLo,
      domain.xHi,
      domain.xScale,
      format,
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      labels: true,
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const { X, Y, xScale: xs, yScale: ys } = scatterFrame(F, domain);
    const sized = points.some((p) => p.size !== undefined);
    const maxSize = Math.max(...points.map((p) => p.size ?? 0), 1);
    const n = points.length || 1;
    const mx = points.reduce((s, p) => s + p.x, 0) / n;
    const my = points.reduce((s, p) => s + p.y, 0) / n;
    const slope =
      points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) /
      (points.reduce((s, p) => s + (p.x - mx) ** 2, 0) || 1);
    const [xLo, xHi] = extent(points.map((p) => p.x));
    const xText = xLabel
      ? `${xLabel} →${sized ? " · size = value" : ""}`
      : undefined;
    const yText = yLabel
      ? truncate(yLabel, T.axis.px, bottom - top)
      : undefined;
    const yLabelX = Math.max(8, T.axis.px / 2 + 8);
    const yLabelY = (top + bottom) / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <TickGrid
          ticks={yTickList}
          at={Y}
          from={left}
          to={right}
          type={T.axis}
        />
        <TickGrid
          ticks={xTickList}
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
            strokeDasharray="3 4"
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
              r={round(3 + Math.sqrt((p.size ?? 0) / maxSize) * 11)}
              fill={colorOf(p.series, ACCENT)}
              fillOpacity="0.18"
              stroke={colorOf(p.series, ACCENT)}
              strokeOpacity="0.75"
              data-part="mark"
              data-i={i}
              data-series={p.series}
              {...stroke.medium}
            />
          ) : (
            <circle
              key={i}
              cx={round(X(p.x))}
              cy={round(Y(p.y))}
              r={3}
              fill={colorOf(p.series, ink(0.5))}
              data-part="mark"
              data-i={i}
              data-series={p.series}
            />
          ),
        )}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={names}
            colors={names.map((_, i) => cat(i))}
          />
        )}
        {yText && (
          <text
            x={round(yLabelX)}
            y={round(yLabelY)}
            transform={`rotate(-90 ${round(yLabelX)} ${round(yLabelY)})`}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {yText}
          </text>
        )}
        {xText && (
          <text
            x={round((left + right) / 2)}
            y={axisY}
            textAnchor="middle"
            {...T.axis.attrs}
          >
            {truncate(xText, T.axis.px, right - left)}
          </text>
        )}
      </ChartSvg>
    );
  },
);

Scatter.displayName = "Scatter";
