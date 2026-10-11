import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { type TickSpec, resolveTicks, upperBound } from "../../core/scale";
import type { Guide, Series } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { GRID, cat } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  Guides,
  SvgLegend,
  TickGrid,
  frame,
} from "../svg";

export type GroupedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
  yTicks?: TickSpec;
  guides?: readonly Guide[];
};

export const GroupedBar = forwardRef<SVGSVGElement, GroupedBarProps>(
  (
    {
      groups,
      series,
      yTicks,
      guides,
      format = formatCompact,
      legend,
      title,
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const showLegend = legend ?? series.length > 1;
    const max = upperBound(
      series.flatMap((s) => s.data),
      yTicks,
      guides,
    );
    const yTickList = resolveTicks(yTicks, 0, max, "linear", format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      labels: true,
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = linear(0, max, bottom, top);
    const X = (i: number) =>
      left + ((right - left) / Math.max(1, groups.length)) * (i + 0.5);
    const groupStep = (right - left) / Math.max(1, groups.length);
    const gap = 4;
    const barW = Math.min(
      48,
      Math.max(
        2,
        (groupStep * 0.7 - gap * Math.max(0, series.length - 1)) /
          Math.max(1, series.length),
      ),
    );
    const centers = groups.map((_, g) => left + groupStep * (g + 0.5));
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
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
        <TickGrid
          ticks={yTickList}
          at={Y}
          from={left}
          to={right}
          type={T.axis}
        />
        <Guides
          guides={guides}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        {showLegend && (
          <SvgLegend
            frame={F}
            names={series.map((s) => s.name)}
            colors={series.map((_, k) => cat(k))}
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
              (series.length * barW + Math.max(0, series.length - 1) * gap) /
                2 +
              k * (barW + gap);
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
