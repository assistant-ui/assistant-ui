import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { GRID, cat } from "../../core/theme";
import { AxisLabels, ChartSvg, Legend, TickGrid, vbHeight } from "../svg";

export type GroupedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
  yTicks?: readonly { at: number; label: string }[];
};

export const GroupedBar = forwardRef<SVGSVGElement, GroupedBarProps>(
  (
    { groups, series, yTicks, legend, title, aspect, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const showLegend = legend ?? series.length > 1;
    const top = showLegend ? 24 : 12;
    const bottom = vh - 16;
    const leftEdge = 14;
    const max = Math.max(
      ...series.flatMap((s) => s.data),
      ...(yTicks?.map((tick) => tick.at) ?? []),
      1,
    );
    const Y = (v: number) => bottom - (v / max) * (bottom - top - 4);
    const groupStep = 176 / Math.max(1, groups.length);
    const barW = Math.min(13, (groupStep * 0.7) / Math.max(1, series.length));
    const centers = groups.map((_, g) => 14 + groupStep * (g + 0.5));
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
        <TickGrid ticks={yTicks} at={Y} from={leftEdge} to={190} />
        {showLegend && (
          <Legend
            names={series.map((s) => s.name)}
            colors={series.map((_, k) => cat(k))}
          />
        )}
        {groups.map((_, g) => (
          <rect
            key={`hit-${g}`}
            x={round(14 + groupStep * g)}
            y={top}
            width={round(groupStep)}
            height={bottom - top}
            fill="transparent"
            data-part="mark"
            data-i={g}
          />
        ))}
        {groups.map((group, g) =>
          series.map((s, k) => {
            const v = s.data[g] ?? 0;
            const h = bottom - Y(v);
            const x =
              centers[g]! -
              (series.length * barW + (series.length - 1) * 2) / 2 +
              k * (barW + 2);
            return (
              <rect
                key={`${group}-${s.name}`}
                x={round(x)}
                y={round(bottom - h)}
                width={round(barW)}
                height={round(h)}
                fill={cat(k)}
                opacity="0.9"
                data-part="mark"
                data-series={s.name}
                data-i={g}
              />
            );
          }),
        )}
        <AxisLabels labels={groups} xs={centers} y={vh - 4} />
      </ChartSvg>
    );
  },
);

GroupedBar.displayName = "GroupedBar";
