import type { BaseProps, Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { barPath, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type BarProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
};

export function Bar({
  items,
  highlight = "max",
  format = formatCompact,
  title,
  aspect,
  className,
}: BarProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const max = Math.max(...items.map((r) => r.value), 1);
  const highest = Math.max(...items.map((r) => r.value));
  const rowH = Math.min(19.5, (vh - 12) / Math.max(1, items.length));
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      <line
        x1="44"
        y1="8"
        x2="44"
        y2={vh - 8}
        stroke={GRID}
        data-part="grid"
        {...stroke.hair}
      />
      {items.map((row, i) => {
        const y = 10 + i * rowH;
        const w = Math.max((row.value / max) * 130, 2);
        const accent =
          highlight === "max" ? row.value === highest : row.label === highlight;
        return (
          <g key={row.label} data-part="mark" data-i={i}>
            <text x="40" y={y + rowH / 2} textAnchor="end" {...TXT.label}>
              {row.label}
            </text>
            <path
              d={barPath(44, y, w, rowH - 8.5, 2.5, "right")}
              fill={accent ? ACCENT : ink(0.3)}
            />
            <text x={44 + w + 4} y={y + rowH / 2} {...TXT.axis}>
              {format(row.value)}
            </text>
          </g>
        );
      })}
    </ChartSvg>
  );
}
