import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, ScaleKind, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import {
  areaPath,
  bandPath,
  linePath,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { GRID, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  Guides,
  TickGrid,
  labelXs,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type AreaProps = BaseProps & {
  data: number[];
  yMax?: number;
  yScale?: ScaleKind;
  yTicks?: readonly Tick[];
  regions?: { from: number; to: number; label?: string }[];
  bands?: readonly { lower: number[]; upper: number[] }[];
  guides?: readonly Guide[];
};

export const Area = forwardRef<SVGSVGElement, AreaProps>(
  (
    {
      data,
      yMax,
      yScale = "linear",
      yTicks,
      regions,
      bands,
      guides,
      labels,
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
    const T = typeScale(density);
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      labels: Boolean(labels),
      ticks: Boolean(yTicks?.length),
    });
    const yValues = [
      ...data,
      ...(bands?.flatMap((band) => [...band.lower, ...band.upper]) ?? []),
      ...(yTicks?.map((tick) => tick.at) ?? []),
      ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
        []),
    ];
    const [yLo, yHi0] =
      yScale === "log" ? positiveExtent(yValues) : [0, Math.max(...yValues, 1)];
    const yHi = yMax ?? yHi0;
    const Y = project(yScale, yLo, yHi, bottom, top);
    const along = (values: number[]) =>
      values.map((v, i) => ({
        x:
          left +
          (values.length > 1 ? (i / (values.length - 1)) * (right - left) : 0),
        y: Y(v),
      }));
    const pts = along(data);
    const X = (i: number) =>
      left + (data.length > 1 ? (i / (data.length - 1)) * (right - left) : 0);
    const last = pts[pts.length - 1];
    const count = Math.max(1, data.length - 1);
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
        {bands?.map((band, i) => (
          <path
            key={`band-${i}`}
            d={bandPath(along(band.upper), along(band.lower))}
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
              y={top}
              width={round(Math.max(0, RX(region.to) - RX(region.from)))}
              height={bottom - top}
              fill={ink(density === "figure" ? 0.09 : 0.06)}
            />
            {region.label && (
              <text
                x={round(RX(region.from)) + 2.5}
                y={top + (density === "figure" ? 6 : 5)}
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
        <path d={areaPath(pts, bottom)} fill={ink(0.1)} data-part="mark" />
        <path
          d={linePath(pts)}
          fill="none"
          stroke={ink(0.7)}
          data-part="mark"
          {...stroke.line}
        />
        {last && (
          <text x={last.x} y={last.y - 5} textAnchor="middle" {...T.value}>
            {format(data[data.length - 1] ?? 0)}
          </text>
        )}
        {pts.map((p, i) => (
          <circle
            key={`hit-${i}`}
            cx={round(p.x)}
            cy={round(p.y)}
            r={Math.min(4, 86 / Math.max(1, pts.length - 1))}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labelXs(
              pts.map((p) => p.x),
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

Area.displayName = "Area";
