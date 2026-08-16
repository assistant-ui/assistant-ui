import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { NEG, POS, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

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
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const rows = sorted ? [...items].sort((a, b) => b.value - a.value) : items;
    const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
    const rowH = (vh - 18) / Math.max(1, rows.length);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="104"
          y1="6"
          x2="104"
          y2={vh - 14}
          stroke={ink(0.15)}
          data-part="grid"
          {...stroke.hair}
        />
        <text x="104" y={vh - 4} textAnchor="middle" {...TXT.axis}>
          0
        </text>
        {rows.map((row, i) => {
          const y = 8 + i * rowH;
          const w = (Math.abs(row.value) / max) * 74;
          const positive = row.value >= 0;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text x="8" y={y + rowH / 2 + 1} {...TXT.axis}>
                {row.label}
              </text>
              {positive ? (
                <rect
                  x={105.5}
                  y={round(y)}
                  width={round(w)}
                  height={round(rowH - 3.6)}
                  fill={POS}
                  opacity="0.85"
                />
              ) : (
                <rect
                  x={round(102.5 - w)}
                  y={round(y)}
                  width={round(w)}
                  height={round(rowH - 3.6)}
                  fill={NEG}
                  opacity="0.85"
                />
              )}
              <text
                x={positive ? 105.5 + w + 3.5 : 102.5 - w - 3.5}
                y={y + rowH / 2 + 1}
                textAnchor={positive ? "start" : "end"}
                {...TXT.axis}
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
