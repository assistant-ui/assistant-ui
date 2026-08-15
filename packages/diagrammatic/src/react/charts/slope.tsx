import type { BaseProps } from "../../core/types";
import { extent, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type SlopeProps = BaseProps & {
  items: { label: string; from: number; to: number }[];
  highlight?: string;
};

export function Slope({
  items,
  highlight,
  labels,
  title,
  aspect,
  className,
}: SlopeProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = vh - 16;
  const [lo, hi] = extent(items.flatMap((r) => [r.from, r.to]));
  const span = hi - lo || 1;
  const Y = (v: number) => bottom - ((v - lo) / span) * (bottom - 16);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      <line
        x1="46"
        y1="12"
        x2="46"
        y2={bottom + 2}
        stroke={GRID}
        data-part="grid"
        {...stroke.hair}
      />
      <line
        x1="150"
        y1="12"
        x2="150"
        y2={bottom + 2}
        stroke={GRID}
        data-part="grid"
        {...stroke.hair}
      />
      {labels?.[0] && (
        <text x="46" y={vh - 4} textAnchor="middle" {...TXT.axis}>
          {labels[0]}
        </text>
      )}
      {labels?.[1] && (
        <text x="150" y={vh - 4} textAnchor="middle" {...TXT.axis}>
          {labels[1]}
        </text>
      )}
      {items.map((row, i) => {
        const accent = highlight !== undefined && row.label === highlight;
        const color = accent ? ACCENT : ink(0.4);
        return (
          <g key={row.label} data-part="mark" data-i={i}>
            <line
              x1="46"
              y1={Y(row.from)}
              x2="150"
              y2={Y(row.to)}
              stroke={color}
              {...(accent ? stroke.line : stroke.medium)}
            />
            <circle cx="46" cy={Y(row.from)} r="2.4" fill={color} />
            <circle cx="150" cy={Y(row.to)} r="2.4" fill={color} />
            <text
              x="156"
              y={Y(row.to) + 1.6}
              fontSize="4.5"
              fill={accent ? ACCENT : TXT.axis.fill}
              fontFamily={TXT.axis.fontFamily}
            >
              {row.label}
            </text>
          </g>
        );
      })}
    </ChartSvg>
  );
}
