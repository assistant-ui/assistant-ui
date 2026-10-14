import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import { round, rowMarkH, rowMid } from "../../core/geometry";
import { NEG, POS, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

export type DivergingStackedProps = BaseProps & {
  rows: { label: string; values: [number, number, number, number, number] }[];
  endLabels?: [string, string];
};

/** Five-band Likert rows anchored on the neutral midpoint. */
const LABEL_SHARE = 0.4;

export const DivergingStacked = forwardRef<
  SVGSVGElement,
  DivergingStackedProps
>(
  (
    {
      rows,
      endLabels = ["disagree", "agree"],
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
    const measured = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelW = Math.max(
      0,
      ...rows.map((row) => textWidth(row.label, measured.label.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      left: Math.min(Math.round(W * LABEL_SHARE), Math.ceil(PAD + labelW + 6)),
    });
    const { left, right, top, bottom, axisY, T } = F;
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
        frame={F}
        title={title}
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
                x={round(left - 6)}
                y={round(mid)}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - PAD - 6)}
              </text>
              {segments.map((segment, k) => {
                const w = Math.max(segment.w * unit - 2, 0.5);
                const x0 = x;
                x += segment.w * unit;
                return (
                  <rect
                    key={k}
                    x={round(x0)}
                    y={round(mid - barH / 2)}
                    width={round(w)}
                    height={round(barH)}
                    fill={segment.fill ?? ink(0.15)}
                    opacity={segment.fill ? segment.opacity : 1}
                  />
                );
              })}
            </g>
          );
        })}
        <text x={round(left)} y={axisY} {...T.axis.attrs} fill={NEG}>
          {truncate(`← ${endLabels[0]}`, T.axis.px, center - left - 6)}
        </text>
        <text x={round(center)} y={axisY} textAnchor="middle" {...T.axis.attrs}>
          neutral
        </text>
        <text
          x={round(right)}
          y={axisY}
          textAnchor="end"
          {...T.axis.attrs}
          fill={POS}
        >
          {truncate(`${endLabels[1]} →`, T.axis.px, right - center - 6)}
        </text>
      </ChartSvg>
    );
  },
);

DivergingStacked.displayName = "DivergingStacked";
