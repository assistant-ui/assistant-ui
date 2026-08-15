import type { BaseProps, Series } from "../../core/types";
import { linePath, polar, round, stroke } from "../../core/geometry";
import { C, GRID } from "../../core/theme";
import { ChartSvg, Legend, TXT, vbHeight } from "../svg";

export type RadarProps = BaseProps & { axes: string[]; series: Series[] };

/** Compares at most two profiles; extra series are ignored by contract. */
export function Radar({
  axes,
  series,
  legend,
  title,
  aspect,
  className,
}: RadarProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const shown = series.slice(0, 2);
  const colors = [C[0], C[2]];
  const showLegend = legend ?? shown.length > 1;
  const cy = vh / 2 - (showLegend ? 4 : 0);
  const radius = Math.min(cy - 12, 44);
  const max = Math.max(...shown.flatMap((s) => s.data), 1);
  const vertex = (t: number, i: number) =>
    polar(100, cy, t * radius, (i / axes.length) * Math.PI * 2 - Math.PI / 2);
  const polygon = (values: number[]) =>
    `${linePath(
      values.map((v, i) => vertex(v / max, i)),
      false,
    )} Z`;
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {[1, 0.66, 0.33].map((level) => (
        <path
          key={level}
          d={polygon(axes.map(() => level * max))}
          fill="none"
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
      ))}
      {axes.map((axis, i) => {
        const tip = vertex(1, i);
        const label = polar(
          100,
          cy,
          radius + 8,
          (i / axes.length) * Math.PI * 2 - Math.PI / 2,
        );
        return (
          <g key={axis} data-part="axis">
            <line
              x1="100"
              y1={cy}
              x2={round(tip.x)}
              y2={round(tip.y)}
              stroke={GRID}
              {...stroke.hair}
            />
            <text
              x={round(label.x)}
              y={round(label.y) + 1.8}
              textAnchor="middle"
              {...TXT.axis}
            >
              {axis}
            </text>
          </g>
        );
      })}
      {shown.map((s, k) => (
        <path
          key={s.name}
          d={polygon(s.data)}
          fill={colors[k]}
          fillOpacity="0.14"
          stroke={colors[k]}
          strokeLinejoin="round"
          data-part="mark"
          data-series={s.name}
          {...stroke.line}
        />
      ))}
      {showLegend && (
        <Legend
          names={shown.map((s) => s.name)}
          colors={colors.slice(0, shown.length)}
          x={192}
          y={vh - 5}
          anchor="end"
        />
      )}
    </ChartSvg>
  );
}
