import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { ring } from "../../core/geometry";
import { SURFACE, cat } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type PieProps = BaseProps & {
  items: Item[];
  inner?: number;
  center?: string;
  centerLabel?: string;
};

export const Pie = forwardRef<SVGSVGElement, PieProps>(
  (
    {
      items,
      inner = 0,
      format,
      title,
      aspect,
      className,
      center,
      centerLabel,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const cy = vh / 2;
    const radius = Math.min(cy - 10, 46);
    const total = items.reduce((sum, r) => sum + r.value, 0) || 1;
    const fmt = format ?? ((v: number) => `${Math.round((v / total) * 100)}%`);
    let angle = 0;
    const rowStep = Math.min(15, (vh - 20) / Math.max(1, items.length));
    const legendTop = cy - ((items.length - 1) / 2) * rowStep;
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {items.map((slice, i) => {
          const a0 = angle;
          angle += (slice.value / total) * Math.PI * 2;
          return (
            <path
              key={slice.label}
              d={ring(
                64,
                cy,
                Math.max(inner * radius, 0.001),
                radius,
                a0,
                angle,
              )}
              fill={cat(i)}
              fillOpacity="0.9"
              stroke={SURFACE}
              strokeWidth="2"
              data-part="mark"
              data-i={i}
            />
          );
        })}
        {center && (
          <text
            x="64"
            y={cy - 1}
            textAnchor="middle"
            fontSize="10"
            fill={TXT.value.fill}
            fontFamily={TXT.value.fontFamily}
          >
            {center}
          </text>
        )}
        {centerLabel && (
          <text x="64" y={cy + 8.5} textAnchor="middle" {...TXT.axis}>
            {centerLabel}
          </text>
        )}
        <g data-part="legend">
          {items.map((slice, i) => {
            const y = legendTop + i * rowStep;
            return (
              <g key={slice.label}>
                <circle cx="126" cy={y} r="2.4" fill={cat(i)} />
                <text x="132" y={y + 1.8} {...TXT.label}>
                  {slice.label}
                </text>
                <text x="188" y={y + 1.8} textAnchor="end" {...TXT.value}>
                  {fmt(slice.value)}
                </text>
              </g>
            );
          })}
        </g>
      </ChartSvg>
    );
  },
);

Pie.displayName = "Pie";
