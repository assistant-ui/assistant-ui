import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import { extent, linear, rowMid, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  PAD,
  frame,
  resolveWidth,
  typeScale,
} from "../svg";

export type StripPlotProps = BaseProps & {
  rows: { label: string; values: number[] }[];
  showMean?: boolean;
};

const DOT_RADIUS = 3;
const JITTER_X = 1.5;
const JITTER_Y = 4;
const MEAN_HALF = 8;

export const StripPlot = forwardRef<SVGSVGElement, StripPlotProps>(
  (
    {
      rows,
      showMean = true,
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
    const [lo, hi] = extent(rows.flatMap((row) => row.values));
    const type = typeScale(fontSize);
    const W = resolveWidth(width);
    const widest = Math.max(
      0,
      ...rows.map((row) => textWidth(row.label, type.label.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(labels),
      left: Math.min(Math.round(W * 0.4), Math.ceil(PAD + widest + 6)),
    });
    const { left, right, top, bottom, axisY, T } = F;
    const X = linear(lo, hi, left, right);
    const rowH = (bottom - top) / Math.max(1, rows.length);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {rows.map((row, i) => {
          const y = rowMid(i, rowH, top);
          const mean =
            row.values.reduce((a, b) => a + b, 0) / (row.values.length || 1);
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - 6 - PAD)}
              </text>
              <line
                x1={left}
                y1={y}
                x2={right}
                y2={y}
                stroke={GRID}
                {...stroke.hair}
              />
              {row.values.map((v, k) => (
                <circle
                  key={k}
                  cx={X(v) + ((k % 3) - 1) * JITTER_X}
                  cy={y + ((k % 3) - 1) * JITTER_Y}
                  r={DOT_RADIUS}
                  fill={ink(0.4)}
                />
              ))}
              {showMean && (
                <line
                  x1={X(mean)}
                  y1={y - MEAN_HALF}
                  x2={X(mean)}
                  y2={y + MEAN_HALF}
                  stroke={ACCENT}
                  {...stroke.line}
                />
              )}
            </g>
          );
        })}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={labels.map(
              (_, i) =>
                left + (i * (right - left)) / Math.max(1, labels.length - 1),
            )}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

StripPlot.displayName = "StripPlot";
