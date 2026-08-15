import type { BaseProps, Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type LollipopProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
};

export function Lollipop({
  items,
  highlight = "max",
  format = formatCompact,
  title,
  aspect,
  className,
}: LollipopProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = vh - 16;
  const max = Math.max(...items.map((r) => r.value), 1);
  const highest = Math.max(...items.map((r) => r.value));
  const step = 176 / Math.max(1, items.length);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
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
        const x = 14 + step * (i + 0.5);
        const y = bottom - (row.value / max) * (bottom - 22);
        const accent =
          highlight === "max" ? row.value === highest : row.label === highlight;
        return (
          <g key={row.label} data-part="mark" data-i={i}>
            <line
              x1={x}
              y1={bottom}
              x2={x}
              y2={y + 4}
              stroke={ink(0.3)}
              {...stroke.medium}
            />
            <circle cx={x} cy={y} r="4.5" fill={accent ? ACCENT : ink(0.55)} />
            {accent && (
              <text x={x} y={y - 7} textAnchor="middle" {...TXT.value}>
                {format(row.value)}
              </text>
            )}
            <text x={x} y={vh - 4} textAnchor="middle" {...TXT.axis}>
              {row.label}
            </text>
          </g>
        );
      })}
    </ChartSvg>
  );
}
