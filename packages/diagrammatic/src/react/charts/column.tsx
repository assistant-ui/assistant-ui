import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { barPath, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type ColumnProps = BaseProps & {
  items: Item[];
  highlight?: "max" | "last" | string;
};

export const Column = forwardRef<SVGSVGElement, ColumnProps>(
  (
    {
      items,
      highlight = "last",
      format = formatCompact,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = vh - 16;
    const max = Math.max(...items.map((r) => r.value), 1);
    const highest = Math.max(...items.map((r) => r.value));
    const step = 176 / Math.max(1, items.length);
    const width = Math.min(16, step * 0.62);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="10"
          y1={bottom}
          x2="190"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {items.map((row, i) => {
          const x = 14 + step * (i + 0.5) - width / 2;
          const h = (row.value / max) * (bottom - 20);
          const accent =
            highlight === "last"
              ? i === items.length - 1
              : highlight === "max"
                ? row.value === highest
                : row.label === highlight;
          return (
            <g key={`${row.label}-${i}`} data-part="mark" data-i={i}>
              <path
                d={barPath(x, bottom - h, width, h, 3, "top")}
                fill={accent ? ACCENT : ink(0.3)}
              />
              {accent && (
                <text
                  x={x + width / 2}
                  y={bottom - h - 4}
                  textAnchor="middle"
                  {...TXT.value}
                >
                  {format(row.value)}
                </text>
              )}
              <text
                x={x + width / 2}
                y={vh - 4}
                textAnchor="middle"
                {...TXT.axis}
              >
                {row.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Column.displayName = "Column";
