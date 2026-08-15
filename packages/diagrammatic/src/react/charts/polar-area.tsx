import type { BaseProps, Item } from "../../core/types";
import { polar, ring, round } from "../../core/geometry";
import { ACCENT, seqOpacity } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type PolarAreaProps = BaseProps & { items: Item[] };

export function PolarArea({ items, title, aspect, className }: PolarAreaProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const cy = vh / 2;
  const outer = Math.min(cy - 14, 50);
  const slice = (Math.PI * 2) / Math.max(1, items.length);
  const gap = 0.035;
  const max = Math.max(...items.map((r) => r.value), 1);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {items.map((item, i) => {
        const t = item.value / max;
        return (
          <path
            key={item.label}
            d={ring(
              100,
              cy,
              6,
              8 + t * (outer - 8),
              i * slice + gap,
              (i + 1) * slice - gap,
            )}
            fill={ACCENT}
            opacity={seqOpacity(t)}
            data-part="mark"
            data-i={i}
          />
        );
      })}
      {items.map((item, i) => {
        const angle = i * slice + slice / 2 - Math.PI / 2;
        const p = polar(100, cy, outer + 8, angle);
        return (
          <text
            key={item.label}
            x={round(p.x)}
            y={round(p.y) + 1.6}
            textAnchor="middle"
            {...TXT.axis}
          >
            {item.label}
          </text>
        );
      })}
    </ChartSvg>
  );
}
