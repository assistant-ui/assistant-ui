import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type ColumnProps = BaseProps & {
  items: Item[];
  highlight?: "max" | "last" | string;
  categorical?: boolean;
  values?: boolean;
};

/**
 * `categorical` colors each item as its own entity from the token palette;
 * `values` prints every value, not only the highlighted one.
 */
export const Column = forwardRef<SVGSVGElement, ColumnProps>(
  (
    {
      items,
      highlight = "last",
      categorical,
      values,
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
        {items.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={round(14 + step * i)}
            y={10}
            width={round(step)}
            height={bottom - 10}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
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
              <rect
                x={round(x)}
                y={round(bottom - h)}
                width={round(width)}
                height={round(h)}
                fill={categorical ? cat(i) : accent ? ACCENT : ink(0.3)}
                opacity={categorical ? 0.9 : 1}
              />
              {(values || (!categorical && accent)) && (
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
