import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { polar, ring, round } from "../../core/geometry";
import { ACCENT, SURFACE, seqOpacity } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type PolarAreaProps = BaseProps & { items: Item[] };

export const PolarArea = forwardRef<SVGSVGElement, PolarAreaProps>(
  ({ items, title, aspect, density, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const cy = vh / 2;
    const outer = Math.min(cy - 14, 50);
    const slice = (Math.PI * 2) / Math.max(1, items.length);
    const max = Math.max(...items.map((r) => r.value), 1);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
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
                i * slice,
                (i + 1) * slice,
              )}
              fill={ACCENT}
              fillOpacity={seqOpacity(t)}
              stroke={SURFACE}
              strokeWidth="2"
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
              {...T.axis}
            >
              {item.label}
            </text>
          );
        })}
      </ChartSvg>
    );
  },
);

PolarArea.displayName = "PolarArea";
