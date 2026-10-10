import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, ScaleKind, Series } from "../../core/types";
import { formatCompact } from "../../core/types";
import {
  type TickSpec,
  resolveTicks,
  tickValues,
  wantsTicks,
} from "../../core/scale";
import {
  areaPath,
  bandPath,
  linePath,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { textWidth } from "../../core/text";
import { GRID, cat, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  Guides,
  PAD,
  SvgLegend,
  TickGrid,
  frame,
  hitRadius,
  labelXs,
} from "../svg";

export type AreaProps = BaseProps & {
  data?: number[];
  series?: Series[];
  yMax?: number;
  yScale?: ScaleKind;
  yTicks?: TickSpec;
  regions?: { from: number; to: number; label?: string }[];
  bands?: readonly { lower: number[]; upper: number[] }[];
  guides?: readonly Guide[];
};

export const Area = forwardRef<SVGSVGElement, AreaProps>(
  (
    {
      data,
      series,
      yMax,
      yScale = "linear",
      yTicks,
      regions,
      bands,
      guides,
      labels,
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
    const all: Series[] =
      series && series.length > 0 ? series : [{ name: "", data: data ?? [] }];
    const multi = all.length > 1;
    const showLegend = legend ?? (multi && all.some((s) => s.name));
    const yValues = [
      ...all.flatMap((s) => s.data),
      ...(bands?.flatMap((band) => [...band.lower, ...band.upper]) ?? []),
      ...tickValues(yTicks),
      ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
        []),
    ];
    const [yLo, yHi0] =
      yScale === "log" ? positiveExtent(yValues) : [0, Math.max(...yValues, 1)];
    const yHi = yMax ?? yHi0;
    const ticks = resolveTicks(yTicks, yLo, yHi, yScale, format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      labels: Boolean(labels),
      ticks: wantsTicks(yTicks) ? (ticks ?? true) : false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = project(yScale, yLo, yHi, bottom, top);
    const along = (values: number[]) =>
      values.map((v, i) => ({
        x:
          left +
          (values.length > 1 ? (i / (values.length - 1)) * (right - left) : 0),
        y: Y(v),
      }));
    const plotted = all.map((s) => along(s.data));
    const primary = all[0]!;
    const pts = plotted[0]!;
    const length = Math.max(...all.map((s) => s.data.length), 0);
    const X = (i: number) =>
      left + (length > 1 ? (i / (length - 1)) * (right - left) : 0);
    const last = multi ? undefined : pts[pts.length - 1];
    const count = Math.max(1, length - 1);
    const span = right - left;
    const RX = (i: number) =>
      left + (Math.max(0, Math.min(count, i)) / count) * span;
    const hit = hitRadius(span, count);
    const endLabel = format(primary.data[primary.data.length - 1] ?? 0);
    const endX = last
      ? Math.min(last.x, F.width - PAD - textWidth(endLabel, T.value.px) / 2)
      : 0;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <TickGrid ticks={ticks} at={Y} from={left} to={right} type={T.axis} />
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
              y={top - 4}
              width={round(Math.max(0, RX(region.to) - RX(region.from)))}
              height={round(bottom - top + 4)}
              fill={ink(0.07)}
            />
            {region.label && (
              <text
                x={round(RX(region.from)) + 5}
                y={round(top + T.label.px - 2)}
                {...T.label.attrs}
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
        {plotted.map((points, k) => (
          <g key={all[k]!.name || `series-${k}`}>
            <path
              d={areaPath(points, bottom)}
              fill={multi ? cat(k) : ink(0.1)}
              fillOpacity={multi ? 0.22 : undefined}
              data-part="mark"
              data-series={all[k]!.name || undefined}
            />
            <path
              d={linePath(points)}
              fill="none"
              stroke={multi ? cat(k) : ink(0.7)}
              data-part="mark"
              data-series={all[k]!.name || undefined}
              {...stroke.line}
            />
          </g>
        ))}
        {last && (
          <text
            x={round(endX)}
            y={round(last.y - 7)}
            textAnchor="middle"
            {...T.value.attrs}
          >
            {endLabel}
          </text>
        )}
        {plotted.map((points, k) =>
          points.map((p, i) => (
            <circle
              key={`hit-${k}-${i}`}
              cx={round(p.x)}
              cy={round(p.y)}
              r={hit}
              fill="transparent"
              data-part="mark"
              data-i={i}
              data-series={all[k]!.name || undefined}
            />
          )),
        )}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={all.map((s) => s.name)}
            colors={all.map((_, k) => cat(k))}
          />
        )}
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
