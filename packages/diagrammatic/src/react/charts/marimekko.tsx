import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { cat } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type MarimekkoProps = BaseProps & {
  columns: { label: string; width: number; shares: Item[] }[];
};

export const Marimekko = forwardRef<SVGSVGElement, MarimekkoProps>(
  ({ columns, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const bottom = vh - 14;
    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0) || 1;
    let x = 8;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {columns.map((column, c) => {
          const w =
            (column.width / totalWidth) * (184 - (columns.length - 1) * 2);
          const x0 = x;
          x += w + 2;
          const total = column.shares.reduce((sum, s) => sum + s.value, 0) || 1;
          let y = 8;
          return (
            <g key={column.label} data-part="mark" data-i={c}>
              {column.shares.map((share, k) => {
                const h = (share.value / total) * (bottom - 8) - 1.6;
                const y0 = y;
                y += (share.value / total) * (bottom - 8);
                const labelFits = c === 0 && h > 9 && w > 30;
                return (
                  <g key={share.label} data-series={share.label}>
                    <rect
                      x={x0}
                      y={y0}
                      width={w}
                      height={Math.max(h, 0.5)}
                      rx="2"
                      fill={cat(k)}
                      opacity="0.88"
                    />
                    {labelFits && (
                      <text x={x0 + 5} y={y0 + h / 2 + 1.8} {...TXT.onSeries}>
                        {share.label}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={x0 + w / 2} y={vh - 4} textAnchor="middle" {...TXT.axis}>
                {column.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Marimekko.displayName = "Marimekko";
