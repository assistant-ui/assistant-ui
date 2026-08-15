import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { barPath, stroke } from "../../core/geometry";
import { GRID, cat } from "../../core/theme";
import { AxisLabels, ChartSvg, Legend, vbHeight } from "../svg";

export type StackedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
  normalize?: boolean;
};

export const StackedBar = forwardRef<SVGSVGElement, StackedBarProps>(
  (
    { groups, series, normalize, legend, title, aspect, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const showLegend = legend ?? series.length > 1;
    const top = showLegend ? 26 : 14;
    const bottom = vh - 16;
    const totals = groups.map((_, g) =>
      series.reduce((sum, s) => sum + (s.data[g] ?? 0), 0),
    );
    const max = Math.max(...totals, 1);
    const step = 176 / Math.max(1, groups.length);
    const width = Math.min(20, step * 0.55);
    const centers = groups.map((_, g) => 14 + step * (g + 0.5));
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <line
          x1="10"
          y1={bottom}
          x2="190"
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        {showLegend && (
          <Legend
            names={series.map((s) => s.name)}
            colors={series.map((_, k) => cat(k))}
          />
        )}
        {groups.map((group, g) => {
          let cursor = bottom;
          const denominator = normalize ? totals[g] || 1 : max;
          return series.map((s, k) => {
            const v = s.data[g] ?? 0;
            const h = (v / denominator) * (bottom - top);
            const gap = k === 0 ? 0 : 1.6;
            const y = cursor - h;
            const x = centers[g]! - width / 2;
            const segment =
              k === series.length - 1 ? (
                <path
                  key={`${group}-${s.name}`}
                  d={barPath(x, y - gap, width, h, 3, "top")}
                  fill={cat(k)}
                  opacity="0.9"
                  data-part="mark"
                  data-series={s.name}
                  data-i={g}
                />
              ) : (
                <rect
                  key={`${group}-${s.name}`}
                  x={x}
                  y={y - gap}
                  width={width}
                  height={h}
                  fill={cat(k)}
                  opacity="0.9"
                  data-part="mark"
                  data-series={s.name}
                  data-i={g}
                />
              );
            cursor = y - gap;
            return segment;
          });
        })}
        <AxisLabels labels={groups} xs={centers} y={vh - 4} />
      </ChartSvg>
    );
  },
);

StackedBar.displayName = "StackedBar";
