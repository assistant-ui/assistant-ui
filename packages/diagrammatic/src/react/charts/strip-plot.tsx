import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, linear, rowMid, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type StripPlotProps = BaseProps & {
  rows: { label: string; values: number[] }[];
  showMean?: boolean;
};

export const StripPlot = forwardRef<SVGSVGElement, StripPlotProps>(
  (
    {
      rows,
      showMean = true,
      labels,
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
      left: density === "figure" ? 36 : 30,
    });
    const [lo, hi] = extent(rows.flatMap((r) => r.values));
    const X = linear(lo, hi, left, right);
    const rowH = (bottom - top) / Math.max(1, rows.length);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {rows.map((row, i) => {
          const y = rowMid(i, rowH, top);
          const mean =
            row.values.reduce((a, b) => a + b, 0) / (row.values.length || 1);
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 4}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                {...T.axis}
              >
                {row.label}
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
                  cx={X(v) + ((k % 3) - 1) * 1.4}
                  cy={y + ((k % 3) - 1) * 3.8}
                  r="3"
                  fill={ink(0.4)}
                />
              ))}
              {showMean && (
                <line
                  x1={X(mean)}
                  y1={y - 8.5}
                  x2={X(mean)}
                  y2={y + 8.5}
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
