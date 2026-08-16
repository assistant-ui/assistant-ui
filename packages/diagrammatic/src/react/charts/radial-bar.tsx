import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { arcStroke } from "../../core/geometry";
import { cat, ink } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

export type RadialBarProps = BaseProps & {
  items: { label: string; value: number; max?: number }[];
};

export const RadialBar = forwardRef<SVGSVGElement, RadialBarProps>(
  ({ items, format, title, aspect, density, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const cy = vh / 2;
    const outer = Math.min(cy - 8, 46);
    const trackGap = (outer - 14) / Math.max(1, items.length - 1 || 1);
    const fmt =
      format ??
      ((v: number) => (v <= 1 ? `${Math.round(v * 100)}%` : String(v)));
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
          const r = outer - i * Math.min(trackGap, 12);
          const share = Math.max(0, Math.min(1, item.value / (item.max ?? 1)));
          const rowY = cy - ((items.length - 1) / 2) * 15 + i * 15;
          return (
            <g key={item.label} data-part="mark" data-i={i}>
              <g fill="none" strokeLinecap="round" strokeWidth="7">
                <circle cx="64" cy={cy} r={r} stroke={ink(0.08)} />
                <path
                  d={arcStroke(64, cy, r, 0, share * Math.PI * 2 * 0.9999)}
                  stroke={cat(i)}
                  opacity="0.9"
                />
              </g>
              <circle cx="128" cy={rowY} r="2.4" fill={cat(i)} />
              <text x="134" y={rowY + 1.8} {...T.label}>
                {item.label}
              </text>
              <text x="188" y={rowY + 1.8} textAnchor="end" {...T.value}>
                {fmt(item.value)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

RadialBar.displayName = "RadialBar";
