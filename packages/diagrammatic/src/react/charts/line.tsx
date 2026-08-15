import type { BaseProps, Series } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linePath, scalePoints, stroke } from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, Legend, TXT, vbHeight } from "../svg";

export type LineProps = BaseProps & {
  data?: number[];
  series?: Series[];
  yMax?: number;
};

export function Line({
  data,
  series,
  yMax,
  labels,
  legend,
  format = formatCompact,
  title,
  aspect,
  className,
}: LineProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const all: Series[] = series ?? [{ name: "", data: data ?? [] }];
  const multi = all.length > 1;
  const showLegend = legend ?? multi;
  const top = showLegend ? 22 : 12;
  const bottom = labels ? vh - 16 : vh - 8;
  const max = yMax ?? Math.max(...all.flatMap((s) => s.data), 1);
  const grids = all.map((s) =>
    scalePoints(s.data, 14, 186, bottom, top, 0, max),
  );
  const first = grids[0] ?? [];
  const last = first[first.length - 1];
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      <line
        x1="14"
        y1={bottom}
        x2="186"
        y2={bottom}
        stroke={GRID}
        data-part="grid"
        {...stroke.hair}
      />
      {grids.map((pts, k) => (
        <path
          key={k}
          d={linePath(pts)}
          fill="none"
          stroke={multi ? cat(k) : ink(0.75)}
          opacity={multi ? 0.85 : 1}
          data-part="mark"
          data-series={all[k]!.name}
          {...stroke.line}
        />
      ))}
      {!multi && last && (
        <g>
          <circle
            cx={last.x}
            cy={last.y}
            r="2.8"
            fill={ACCENT}
            data-part="mark"
          />
          <text x={last.x} y={last.y - 6} textAnchor="middle" {...TXT.value}>
            {format(all[0]!.data[all[0]!.data.length - 1] ?? 0)}
          </text>
        </g>
      )}
      {showLegend && multi && (
        <Legend
          names={all.map((s) => s.name)}
          colors={all.map((_, k) => cat(k))}
        />
      )}
      {labels && (
        <AxisLabels labels={labels} xs={first.map((p) => p.x)} y={vh - 4} />
      )}
    </ChartSvg>
  );
}
