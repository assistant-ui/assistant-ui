import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type StripPlotProps = BaseProps & {
  rows: { label: string; values: number[] }[];
  showMean?: boolean;
};

export const StripPlot = forwardRef<SVGSVGElement, StripPlotProps>(
  (
    { rows, showMean = true, labels, title, aspect, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = labels ? vh - 14 : vh - 6;
    const [lo, hi] = extent(rows.flatMap((r) => r.values));
    const span = hi - lo || 1;
    const X = (v: number) => 30 + ((v - lo) / span) * 156;
    const rowStep = (bottom - 18) / Math.max(1, rows.length - 1 || 1);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {rows.map((row, i) => {
          const y = 14 + i * rowStep;
          const mean =
            row.values.reduce((a, b) => a + b, 0) / (row.values.length || 1);
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text x="8" y={y + 1.8} {...TXT.axis}>
                {row.label}
              </text>
              <line
                x1="28"
                y1={y}
                x2="188"
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
              (_, i) => 30 + (i * 156) / Math.max(1, labels.length - 1),
            )}
            y={vh - 3}
          />
        )}
      </ChartSvg>
    );
  },
);

StripPlot.displayName = "StripPlot";
