import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

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
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const max = Math.max(...items.map((r) => r.value), ...(ticks ?? []), 1);
    const highest = Math.max(...items.map((r) => r.value));
    const X = (v: number) => 44 + (v / max) * 142;
    const rowH = (vh - (ticks ? 24 : 12)) / Math.max(1, items.length);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {ticks?.map((tick) => (
          <g key={tick}>
            <line
              x1={X(tick)}
              y1="8"
              x2={X(tick)}
              y2={vh - 18}
              stroke={GRID}
              data-part="grid"
              {...stroke.hair}
            />
            <text x={X(tick)} y={vh - 6} textAnchor="middle" {...TXT.axis}>
              {format(tick)}
            </text>
          </g>
        ))}
        {items.map((row, i) => {
          const y = 12 + rowH * i;
          const accent =
            highlight === "max"
              ? row.value === highest
              : row.label === highlight;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text x="8" y={y + 1.8} {...TXT.axis}>
                {row.label}
              </text>
              <line
                x1="44"
                y1={y}
                x2="186"
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
