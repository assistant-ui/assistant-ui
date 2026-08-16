import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, rowMid, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, plotFrame, typeScale, vbHeight } from "../svg";

export type DotPlotProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
  ticks?: number[];
};

export const DotPlot = forwardRef<SVGSVGElement, DotPlotProps>(
  (
    {
      items,
      highlight = "max",
      ticks,
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
      labels: Boolean(ticks?.length),
      left: density === "figure" ? 50 : 44,
    });
    const max = Math.max(...items.map((r) => r.value), ...(ticks ?? []), 1);
    const highest = Math.max(...items.map((r) => r.value));
    const X = linear(0, max, left, right);
    const rowH = (bottom - top) / Math.max(1, items.length);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {ticks?.map((tick) => (
          <g key={tick}>
            <line
              x1={X(tick)}
              y1={top}
              x2={X(tick)}
              y2={bottom}
              stroke={GRID}
              data-part="grid"
              {...stroke.hair}
            />
            <text x={X(tick)} y={axisY} textAnchor="middle" {...T.axis}>
              {format(tick)}
            </text>
          </g>
        ))}
        {items.map((row, i) => {
          const y = rowMid(i, rowH, top);
          const accent =
            highlight === "max"
              ? row.value === highest
              : row.label === highlight;
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
              <circle
                cx={X(row.value)}
                cy={y}
                r="4"
                fill={accent ? ACCENT : ink(0.55)}
              />
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

DotPlot.displayName = "DotPlot";
