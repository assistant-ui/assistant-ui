import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { linePath, scalePoints } from "../../core/geometry";
import { ACCENT, SURFACE, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type RidgelineProps = BaseProps & {
  rows: { label: string; bins: number[] }[];
  highlight?: string;
};

export const Ridgeline = forwardRef<SVGSVGElement, RidgelineProps>(
  (
    { rows, highlight, labels, title, aspect, density, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      labels: Boolean(labels),
      left: density === "figure" ? 36 : 34,
    });
    const rowStep = (bottom - top) / Math.max(1, rows.length);
    const max = Math.max(...rows.flatMap((r) => r.bins), 1);
    const rise = Math.min(30, rowStep * 1.7);
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
          const baseline = top + (i + 1) * rowStep - 2;
          const pts = scalePoints(
            row.bins,
            left,
            right,
            baseline,
            baseline - rise,
            0,
            max,
          );
          const accent = highlight !== undefined && row.label === highlight;
          return (
            <g
              key={row.label}
              data-part="mark"
              data-i={i}
              data-series={row.label}
            >
              <path
                d={`${linePath(pts)} L${right} ${baseline} L${left} ${baseline} Z`}
                fill={SURFACE}
                stroke={accent ? ACCENT : ink(0.4)}
                strokeWidth={accent ? 1.5 : 1}
                vectorEffect="non-scaling-stroke"
              />
              <text x={left - 2} y={baseline + 1} textAnchor="end" {...T.axis}>
                {row.label}
              </text>
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

Ridgeline.displayName = "Ridgeline";
