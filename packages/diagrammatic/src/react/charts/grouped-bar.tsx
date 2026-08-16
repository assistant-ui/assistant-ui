import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series, Tick } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { GRID, cat } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  Legend,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type GroupedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
  yTicks?: readonly Tick[];
};

export const GroupedBar = forwardRef<SVGSVGElement, GroupedBarProps>(
  (
    {
      groups,
      series,
      yTicks,
      legend,
      title,
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const showLegend = legend ?? series.length > 1;
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      legend: showLegend,
      labels: true,
      ticks: Boolean(yTicks?.length),
    });
    const max = Math.max(
      ...series.flatMap((s) => s.data),
      ...(yTicks?.map((tick) => tick.at) ?? []),
      1,
    );
    const Y = linear(0, max, bottom, top);
    const groupStep = (right - left) / Math.max(1, groups.length);
    const barW = Math.min(13, (groupStep * 0.7) / Math.max(1, series.length));
    const centers = groups.map((_, g) => left + groupStep * (g + 0.5));
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <line
          x1={left}
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <TickGrid ticks={yTicks} at={Y} from={left} to={right} type={T.axis} />
        {showLegend && (
          <Legend
            names={series.map((s) => s.name)}
            colors={series.map((_, k) => cat(k))}
            type={T.axis}
          />
        )}
        {groups.map((_, g) => (
          <rect
            key={`hit-${g}`}
            x={round(left + groupStep * g)}
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
        <AxisLabels labels={groups} xs={centers} y={axisY} type={T.axis} />
      </ChartSvg>
    );
  },
);

GroupedBar.displayName = "GroupedBar";
