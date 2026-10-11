import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import {
  areaPath,
  clamp01,
  rowMid,
  scalePoints,
  stroke,
} from "../../core/geometry";
import { ACCENT, GRID } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  PAD,
  frame,
  resolveWidth,
  typeScale,
} from "../svg";

export type HorizonProps = BaseProps & {
  data?: number[];
  series?: readonly { name: string; data: number[] }[];
  bands?: 2 | 3;
};

const OPACITIES = [0.25, 0.5, 0.85];

export const Horizon = forwardRef<SVGSVGElement, HorizonProps>(
  (
    {
      data,
      series,
      bands = 3,
      labels,
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
    const rows = series?.length ? series : [{ name: "", data: data ?? [] }];
    const named = rows.some((row) => row.name);
    const T = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelW = Math.max(
      0,
      ...rows.map((row) => textWidth(row.name, T.axis.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, named ? 1.35 : 5 / 3, {
      labels: Boolean(labels),
      left: named
        ? Math.min(Math.round(W * 0.4), Math.ceil(PAD + labelW + 6))
        : PAD,
    });
    const { left, right, top, bottom, axisY, T: frameType } = F;
    const rowH = (bottom - top) / Math.max(1, rows.length);
    const peak = Math.max(...rows.flatMap((row) => row.data), 1);
    const count = rows[0]?.data.length ?? 0;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <ColumnHits
          count={count}
          x0={left}
          x1={right}
          top={top}
          bottom={bottom}
        />
        {rows.map((row, ri) => {
          const y1 = top + ri * rowH;
          const y0 = y1 + rowH - 2;
          return (
            <g key={row.name || ri}>
              {row.name ? (
                <text
                  x={left - 6}
                  y={rowMid(ri, rowH, top)}
                  dominantBaseline="central"
                  textAnchor="end"
                  {...frameType.axis.attrs}
                >
                  {truncate(row.name, frameType.axis.px, left - 6 - PAD)}
                </text>
              ) : null}
              {Array.from({ length: bands }, (_, layer) => {
                const values = row.data.map((v) =>
                  clamp01((v / peak) * bands - layer),
                );
                const pts = scalePoints(values, left, right, y0, y1 + 1, 0, 1);
                return (
                  <path
                    key={layer}
                    d={areaPath(pts, y0)}
                    fill={ACCENT}
                    opacity={OPACITIES[layer] ?? 0.9}
                    data-part="mark"
                    data-series={row.name || undefined}
                    data-i={layer}
                  />
                );
              })}
            </g>
          );
        })}
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {rows.length === 1 ? (
          <text
            x={right}
            y={top - 4}
            textAnchor="end"
            {...frameType.axis.attrs}
          >
            {bands} bands · darker = higher
          </text>
        ) : null}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={frameType.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Horizon.displayName = "Horizon";
