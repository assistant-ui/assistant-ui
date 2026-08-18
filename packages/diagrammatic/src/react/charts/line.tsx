import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, ScaleKind, Series, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import {
  bandPath,
  linePath,
  positiveExtent,
  project,
  round,
  stepPath,
  stroke,
} from "../../core/geometry";
import type { Pt } from "../../core/types";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  Guides,
  Legend,
  TickGrid,
  labelXs,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type LineMark = {
  at: number;
  series?: string;
  label?: string;
  kind?: "point" | "censor";
};

export type LineProps = BaseProps & {
  data?: number[];
  series?: Series[];
  xs?: number[];
  xScale?: ScaleKind;
  yScale?: ScaleKind;
  yMax?: number;
  xTicks?: readonly Tick[];
  yTicks?: readonly Tick[];
  step?: boolean;
  regions?: { from: number; to: number; label?: string }[];
  bands?: readonly { lower: number[]; upper: number[] }[];
  marks?: readonly LineMark[];
  guides?: readonly Guide[];
};

function xDomain(
  xs: number[] | undefined,
  extra: number[],
  lastIndex: number,
  xScale: ScaleKind,
): [number, number] {
  if (!xs?.length) return [0, lastIndex];
  const values = [...xs, ...extra];
  return xScale === "log"
    ? positiveExtent(values)
    : [Math.min(...values), Math.max(...values)];
}

function linePoints(
  values: number[],
  left: number,
  right: number,
  Y: (v: number) => number,
  xs: number[] | undefined,
  X: (v: number) => number,
): Pt[] {
  const n = values.length;
  return values.map((v, i) => ({
    x: xs ? X(xs[i] ?? i) : left + (n > 1 ? (i / (n - 1)) * (right - left) : 0),
    y: Y(v),
  }));
}

export const Line = forwardRef<SVGSVGElement, LineProps>(
  (
    {
      data,
      series,
      xs,
      xScale = "linear",
      yScale = "linear",
      yMax,
      xTicks,
      yTicks,
      step,
      regions,
      bands,
      marks,
      guides,
      labels,
      legend,
      format = formatCompact,
      title,
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const all: Series[] = series ?? [{ name: "", data: data ?? [] }];
    const multi = all.length > 1;
    const showLegend = legend ?? multi;
    const T = typeScale(density);
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      legend: showLegend,
      labels: Boolean(labels),
      ticks: Boolean(yTicks?.length || xTicks?.length),
    });
    const yValues = [
      ...all.flatMap((s) => s.data),
      ...(bands?.flatMap((band) => [...band.lower, ...band.upper]) ?? []),
      ...(yTicks?.map((tick) => tick.at) ?? []),
      ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
        []),
    ];
    const [yLo0, yHi0] =
      yScale === "log"
        ? positiveExtent(yValues)
        : [Math.min(0, ...yValues), Math.max(...yValues, 1)];
    const yHi = yMax ?? yHi0;
    const Y = project(yScale, yLo0, yHi, bottom, top);
    const lastIndex = Math.max(0, (all[0]?.data.length ?? 1) - 1);
    const [xLo, xHi] = xDomain(
      xs,
      [
        ...(xTicks?.map((tick) => tick.at) ?? []),
        ...(guides?.filter((g) => g.axis === "x").map((g) => g.at) ?? []),
      ],
      lastIndex,
      xScale,
    );
    const X = project(xScale, xLo, xHi, left, right);
    const grids = all.map((s) => linePoints(s.data, left, right, Y, xs, X));
    const first = grids[0] ?? [];
    const last = first[first.length - 1];
    const count = Math.max(1, (all[0]?.data.length ?? 1) - 1);
    const span = right - left;
    const RX = (i: number) =>
      left + (Math.max(0, Math.min(count, i)) / count) * span;
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
        {bands?.map((band, i) => (
          <path
            key={`band-${i}`}
            d={bandPath(
              linePoints(band.upper, left, right, Y, xs, X),
              linePoints(band.lower, left, right, Y, xs, X),
            )}
            fill={ink(0.12 - Math.min(i, 2) * 0.03)}
            data-part="band"
          />
        ))}
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
        {regions?.map((region) => (
          <g
            key={`${region.from}-${region.to}`}
            data-part="region"
            data-series={region.label}
          >
            <rect
              x={round(RX(region.from))}
              y={top - 2}
              width={round(Math.max(0, RX(region.to) - RX(region.from)))}
              height={bottom - top + 2}
              fill={ink(density === "figure" ? 0.09 : 0.06)}
            />
            {region.label && (
              <text
                x={round(RX(region.from)) + 2.5}
                y={top + (density === "figure" ? 6 : 3.5)}
                {...T.label}
              >
                {region.label}
              </text>
            )}
          </g>
        ))}
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {grids.map((pts, k) => (
          <path
            key={k}
            d={step ? stepPath(pts) : linePath(pts)}
            fill="none"
            stroke={multi ? cat(k) : ink(0.75)}
            opacity={multi ? 0.85 : 1}
            strokeLinejoin="round"
            data-part="mark"
            data-series={all[k]!.name}
            {...stroke.line}
          />
        ))}
        {!multi && last && (
          <g>
            <circle
              cx={last.x}
              cy={last.y}
              r="2.8"
              fill={ACCENT}
              data-part="mark"
            />
            <text x={last.x} y={last.y - 6} textAnchor="middle" {...T.value}>
              {format(all[0]!.data[all[0]!.data.length - 1] ?? 0)}
            </text>
          </g>
        )}
        {grids.map((pts, k) =>
          pts.map((p, i) => (
            <circle
              key={`hit-${k}-${i}`}
              cx={round(p.x)}
              cy={round(p.y)}
              r={Math.min(4, 86 / count)}
              fill="transparent"
              data-part="mark"
              data-i={i}
              data-series={all[k]!.name || undefined}
            />
          )),
        )}
        {marks?.map((mark) => {
          const si = mark.series
            ? all.findIndex((s) => s.name === mark.series)
            : 0;
          const pts = si >= 0 ? grids[si] : undefined;
          const p = pts?.[Math.round(mark.at)];
          if (!p) return null;
          const color = multi && si >= 0 ? cat(si) : ACCENT;
          if (mark.kind === "censor") {
            return (
              <g
                key={`${mark.series ?? si}-${mark.at}-censor`}
                data-part="mark"
                data-series={mark.series}
              >
                <line
                  x1={round(p.x)}
                  y1={round(p.y - 3.2)}
                  x2={round(p.x)}
                  y2={round(p.y + 3.2)}
                  stroke={color}
                  {...stroke.medium}
                />
              </g>
            );
          }
          return (
            <g
              key={`${mark.series ?? si}-${mark.at}-${mark.label}`}
              data-part="mark"
              data-series={mark.series}
            >
              <circle
                cx={round(p.x)}
                cy={round(p.y)}
                r={density === "figure" ? 1.7 : 1.3}
                fill={color}
              />
              {mark.label ? (
                <text
                  x={round(p.x)}
                  y={round(p.y - 5)}
                  textAnchor="middle"
                  {...T.value}
                  fill={multi && si >= 0 ? cat(si) : ink(0.75)}
                >
                  {mark.label}
                </text>
              ) : null}
            </g>
          );
        })}
        {showLegend && multi && (
          <Legend
            names={all.map((s) => s.name)}
            colors={all.map((_, k) => cat(k))}
            type={T.axis}
          />
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labelXs(
              first.map((p) => p.x),
              labels.length,
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Line.displayName = "Line";
