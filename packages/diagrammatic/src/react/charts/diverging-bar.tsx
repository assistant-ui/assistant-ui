import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, rowMarkH, rowMid, stroke } from "../../core/geometry";
import { NEG, POS, ink } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type DivergingBarProps = BaseProps & {
  items: Item[];
  sorted?: boolean;
};

export const DivergingBar = forwardRef<SVGSVGElement, DivergingBarProps>(
  (
    {
      items,
      sorted = true,
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
      labels: true,
      left: density === "figure" ? 44 : 38,
    });
    const rows = sorted ? [...items].sort((a, b) => b.value - a.value) : items;
    const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
    const center = (left + right) / 2;
    const half = (right - left) / 2 - 2;
    const X = linear(0, max, 0, half);
    const rowH = (bottom - top) / Math.max(1, rows.length);
    const barH = rowMarkH(rowH, 0.55);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <line
          x1={center}
          y1={top}
          x2={center}
          y2={bottom}
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        <text x={center} y={axisY} textAnchor="middle" {...T.axis}>
          0
        </text>
        {rows.map((row, i) => {
          const mid = rowMid(i, rowH, top);
          const w = X(Math.abs(row.value));
          const positive = row.value >= 0;
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
              {positive ? (
                <rect
                  x={center + 1.5}
                  y={round(mid - barH / 2)}
                  width={round(w)}
                  height={round(barH)}
                  fill={POS}
                  opacity="0.85"
                />
              ) : (
                <rect
                  x={round(center - 1.5 - w)}
                  y={round(mid - barH / 2)}
                  width={round(w)}
                  height={round(barH)}
                  fill={NEG}
                  opacity="0.85"
                />
              )}
              <text
                x={positive ? center + 1.5 + w + 3.5 : center - 1.5 - w - 3.5}
                y={mid}
                textAnchor={positive ? "start" : "end"}
                dominantBaseline="central"
                {...T.axis}
              >
                {positive ? `+${format(row.value)}` : format(row.value)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

DivergingBar.displayName = "DivergingBar";
