import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type BarProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
  categorical?: boolean;
};

export const Bar = forwardRef<SVGSVGElement, BarProps>(
  (
    {
      items,
      highlight = "max",
      categorical,
      format = formatCompact,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const max = Math.max(...items.map((r) => r.value), 1);
    const highest = Math.max(...items.map((r) => r.value));
    const rowH = Math.min(19.5, (vh - 12) / Math.max(1, items.length));
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="44"
          y1="8"
          x2="44"
          y2={vh - 8}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {items.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={44}
            y={round(10 + i * rowH)}
            width={142}
            height={round(rowH)}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {items.map((row, i) => {
          const y = 10 + i * rowH;
          const mid = y + rowH / 2;
          const barH = Math.min(11, Math.max(rowH * 0.55, rowH - 8.5));
          const w = Math.max((row.value / max) * 130, 2);
          const accent =
            highlight === "max"
              ? row.value === highest
              : row.label === highlight;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text x="40" y={mid + 1.8} textAnchor="end" {...TXT.label}>
                {row.label}
              </text>
              <rect
                x={44}
                y={round(mid - barH / 2)}
                width={round(w)}
                height={round(barH)}
                fill={categorical ? cat(i) : accent ? ACCENT : ink(0.3)}
                opacity={categorical ? 0.9 : 1}
              />
              <text x={44 + w + 4} y={mid + 1.8} {...TXT.axis}>
                {format(row.value)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Bar.displayName = "Bar";
