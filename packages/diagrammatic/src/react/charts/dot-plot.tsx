import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, rowMid, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeScale } from "../svg";

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
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const type = typeScale(fontSize);
    const W = resolveWidth(width);
    const labelW = Math.max(
      0,
      ...items.map((row) => textWidth(row.label, type.label.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(ticks?.length),
      left: Math.min(Math.round(W * 0.4), Math.ceil(PAD + labelW + 6)),
    });
    const { left, right, top, bottom, axisY, T } = F;
    const max = Math.max(...items.map((r) => r.value), ...(ticks ?? []), 1);
    const highest = Math.max(...items.map((r) => r.value));
    const X = linear(0, max, left, right);
    const rowH = (bottom - top) / Math.max(1, items.length);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
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
            <text x={X(tick)} y={axisY} textAnchor="middle" {...T.axis.attrs}>
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
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - PAD - 6)}
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
                r={3}
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
