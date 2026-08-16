import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { ring, rowMid } from "../../core/geometry";
import { SURFACE, cat } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

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
      density,
      className,
      center,
      centerLabel,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const cy = vh / 2;
    const radius = Math.min(cy - 10, 46);
    const total = items.reduce((sum, r) => sum + r.value, 0) || 1;
    const fmt = format ?? ((v: number) => `${Math.round((v / total) * 100)}%`);
    let angle = 0;
    const rowH = Math.min(15, (vh - 20) / Math.max(1, items.length));
    const legendTop = cy - (items.length * rowH) / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
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
            fontSize={density === "figure" ? 7.4 : 7}
            fill={T.value.fill}
            fontFamily={T.value.fontFamily}
          >
            {center}
          </text>
        )}
        {centerLabel && (
          <text x="64" y={cy + 8.5} textAnchor="middle" {...T.axis}>
            {centerLabel}
          </text>
        )}
        <g data-part="legend">
          {items.map((slice, i) => {
            const y = rowMid(i, rowH, legendTop);
            return (
              <g key={slice.label}>
                <circle cx="126" cy={y} r="2.4" fill={cat(i)} />
                <text x="132" y={y} dominantBaseline="central" {...T.label}>
                  {slice.label}
                </text>
                <text
                  x="188"
                  y={y}
                  textAnchor="end"
                  dominantBaseline="central"
                  {...T.value}
                >
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
