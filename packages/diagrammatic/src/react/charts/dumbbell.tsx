import type { BaseProps } from "../../core/types";
import { extent, round, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, Legend, TXT, vbHeight } from "../svg";

export type DumbbellProps = BaseProps & {
  items: { label: string; from: number; to: number }[];
  fromLabel?: string;
  toLabel?: string;
};

export function Dumbbell({
  items,
  fromLabel = "before",
  toLabel = "after",
  legend,
  title,
  aspect,
  className,
}: DumbbellProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const showLegend = legend ?? true;
  const top = showLegend ? 20 : 10;
  const [lo, hi] = extent(items.flatMap((r) => [r.from, r.to]));
  const span = hi - lo || 1;
  const X = (v: number) => 44 + ((v - lo) / span) * 140;
  const rowH = (vh - top - 8) / Math.max(1, items.length);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {showLegend && (
        <Legend
          names={[fromLabel, toLabel]}
          colors={[ink(0.45), ACCENT]}
          x={192}
          y={10}
          anchor="end"
        />
      )}
      {items.map((row, i) => {
        const y = top + rowH * (i + 0.5);
        return (
          <g key={row.label} data-part="mark" data-i={i}>
            <text x="8" y={y + 1.8} {...TXT.axis}>
              {row.label}
            </text>
            <line
              x1={round(X(row.from))}
              y1={y}
              x2={round(X(row.to))}
              y2={y}
              stroke={ink(0.25)}
              {...stroke.line}
            />
            <circle cx={round(X(row.from))} cy={y} r="4" fill={ink(0.45)} />
            <circle cx={round(X(row.to))} cy={y} r="4" fill={ACCENT} />
          </g>
        );
      })}
    </ChartSvg>
  );
}
