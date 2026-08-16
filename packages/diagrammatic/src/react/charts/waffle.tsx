import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { rowMid } from "../../core/geometry";
import { cat } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type WaffleProps = BaseProps & { items: Item[] };

export const Waffle = forwardRef<SVGSVGElement, WaffleProps>(
  ({ items, format, title, aspect, density, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const total = items.reduce((sum, r) => sum + r.value, 0) || 1;
    const shares = items.map((r) => Math.round((r.value / total) * 100));
    const drift = 100 - shares.reduce((a, b) => a + b, 0);
    if (shares.length > 0) shares[0]! += drift;
    const cells: number[] = [];
    shares.forEach((count, series) => {
      for (let i = 0; i < count; i += 1) cells.push(series);
    });
    const cell = Math.min(10, (vh - 16) / 10);
    const gridTop = (vh - 10 * cell) / 2 + 1;
    const fmt = format ?? ((v: number) => `${Math.round((v / total) * 100)}%`);
    const rowH = Math.min(15, (vh - 20) / Math.max(1, items.length));
    const legendTop = vh / 2 - (items.length * rowH) / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {cells.slice(0, 100).map((series, i) => (
          <rect
            key={i}
            x={24 + (i % 10) * cell}
            y={gridTop + Math.floor(i / 10) * cell}
            width={cell - 2.4}
            height={cell - 2.4}
            fill={cat(series)}
            opacity="0.88"
            data-part="mark"
            data-series={items[series]?.label}
          />
        ))}
        <g data-part="legend">
          {items.map((item, i) => {
            const y = rowMid(i, rowH, legendTop);
            return (
              <g key={item.label}>
                <circle cx="132" cy={y} r="2.4" fill={cat(i)} />
                <text x="138" y={y} dominantBaseline="central" {...T.label}>
                  {item.label}
                </text>
                <text
                  x="192"
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  {...T.value}
                >
                  {fmt(item.value)}
                </text>
              </g>
            );
          })}
        </g>
      </ChartSvg>
    );
  },
);

Waffle.displayName = "Waffle";
