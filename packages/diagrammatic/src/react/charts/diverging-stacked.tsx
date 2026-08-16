import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { rowMarkH, rowMid } from "../../core/geometry";
import { NEG, POS, ink } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type DivergingStackedProps = BaseProps & {
  rows: { label: string; values: [number, number, number, number, number] }[];
  endLabels?: [string, string];
};

/** Five-band Likert rows anchored on the neutral midpoint. */
export const DivergingStacked = forwardRef<
  SVGSVGElement,
  DivergingStackedProps
>(
  (
    {
      rows,
      endLabels = ["disagree", "agree"],
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
      labels: true,
      left: density === "figure" ? 38 : 34,
    });
    const rowH = (bottom - top) / Math.max(1, rows.length);
    const barH = rowMarkH(rowH, 0.62);
    const maxLeft = Math.max(
      ...rows.map((r) => r.values[0] + r.values[1] + r.values[2] / 2),
      1,
    );
    const maxRight = Math.max(
      ...rows.map((r) => r.values[2] / 2 + r.values[3] + r.values[4]),
      1,
    );
    const unit = (right - left) / (maxLeft + maxRight);
    const center = left + maxLeft * unit;
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
          const mid = rowMid(i, rowH, top);
          const [strongNeg, neg, neutral, pos, strongPos] = row.values;
          let x = center - (strongNeg + neg + neutral / 2) * unit;
          const segments = [
            { w: strongNeg, fill: NEG, opacity: 0.9 },
            { w: neg, fill: NEG, opacity: 0.45 },
            { w: neutral, fill: undefined, opacity: 1 },
            { w: pos, fill: POS, opacity: 0.45 },
            { w: strongPos, fill: POS, opacity: 0.9 },
          ];
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 4}
                y={mid}
                textAnchor="end"
                dominantBaseline="central"
                {...T.axis}
              >
                {row.label}
              </text>
              {segments.map((segment, k) => {
                const w = Math.max(segment.w * unit - 1.6, 0.5);
                const x0 = x;
                x += segment.w * unit;
                return (
                  <rect
                    key={k}
                    x={x0}
                    y={mid - barH / 2}
                    width={w}
                    height={barH}
                    fill={segment.fill ?? ink(0.15)}
                    opacity={segment.fill ? segment.opacity : 1}
                  />
                );
              })}
            </g>
          );
        })}
        <text
          x={left}
          y={axisY}
          fontSize={T.axis.fontSize}
          fill={NEG}
          fontFamily={T.axis.fontFamily}
        >
          ← {endLabels[0]}
        </text>
        <text x={center} y={axisY} textAnchor="middle" {...T.axis}>
          neutral
        </text>
        <text
          x={right}
          y={axisY}
          textAnchor="end"
          fontSize={T.axis.fontSize}
          fill={POS}
          fontFamily={T.axis.fontFamily}
        >
          {endLabels[1]} →
        </text>
      </ChartSvg>
    );
  },
);

DivergingStacked.displayName = "DivergingStacked";
