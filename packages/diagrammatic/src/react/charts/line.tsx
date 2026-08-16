import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { formatCompact } from "../../core/types";
import {
  linePath,
  round,
  scalePoints,
  stepPath,
  stroke,
} from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
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
  label: string;
};

export type LineProps = BaseProps & {
  data?: number[];
  series?: Series[];
  yMax?: number;
  yTicks?: readonly { at: number; label: string }[];
  step?: boolean;
  regions?: { from: number; to: number; label?: string }[];
  marks?: readonly LineMark[];
};

export const Line = forwardRef<SVGSVGElement, LineProps>(
  (
    {
      data,
      series,
      yMax,
      yTicks,
      step,
      regions,
      marks,
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
    const { left, right, top, bottom } = plotFrame(vh, density, {
      legend: showLegend,
      labels: Boolean(labels),
    });
    const max =
      yMax ??
      Math.max(
        ...all.flatMap((s) => s.data),
        ...(yTicks?.map((tick) => tick.at) ?? []),
        1,
      );
    const Y = (v: number) => bottom - (v / max) * (bottom - top);
    const grids = all.map((s) =>
      scalePoints(s.data, left, right, bottom, top, 0, max),
    );
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
                fill={multi && si >= 0 ? cat(si) : ACCENT}
              />
              <text
                x={round(p.x)}
                y={round(p.y - 5)}
                textAnchor="middle"
                {...T.value}
                fill={multi && si >= 0 ? cat(si) : ink(0.75)}
              >
                {mark.label}
              </text>
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
            y={vh - (density === "figure" ? 6 : 4)}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Line.displayName = "Line";
