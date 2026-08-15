import type { BaseProps, Series } from "../../core/types";
import { cat } from "../../core/theme";
import { AxisLabels, ChartSvg, Legend, vbHeight } from "../svg";

export type PercentStackedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
};

export function PercentStackedBar({
  groups,
  series,
  legend,
  title,
  aspect,
  className,
}: PercentStackedBarProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const showLegend = legend ?? series.length > 1;
  const top = showLegend ? 26 : 14;
  const bottom = vh - 16;
  const step = 176 / Math.max(1, groups.length);
  const width = Math.min(21, step * 0.58);
  const centers = groups.map((_, g) => 14 + step * (g + 0.5));
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {showLegend && (
        <Legend
          names={series.map((s) => s.name)}
          colors={series.map((_, k) => cat(k))}
        />
      )}
      {groups.map((group, g) => {
        const total = series.reduce((sum, s) => sum + (s.data[g] ?? 0), 0) || 1;
        let cursor = bottom;
        return series.map((s, k) => {
          const h =
            ((s.data[g] ?? 0) / total) * (bottom - top) - (k === 0 ? 0 : 1.6);
          const y = cursor - h;
          cursor = y - 1.6;
          return (
            <rect
              key={`${group}-${s.name}`}
              x={centers[g]! - width / 2}
              y={y}
              width={width}
              height={Math.max(h, 0.5)}
              rx="2"
              fill={cat(k)}
              opacity="0.9"
              data-part="mark"
              data-series={s.name}
              data-i={g}
            />
          );
        });
      })}
      <AxisLabels labels={groups} xs={centers} y={vh - 4} />
    </ChartSvg>
  );
}
