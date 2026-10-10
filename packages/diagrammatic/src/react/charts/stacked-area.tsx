import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { formatCompact } from "../../core/types";
import { type TickSpec, resolveTicks, upperBound } from "../../core/scale";
import type { Guide, Series } from "../../core/types";
import {
  bandPath,
  linePath,
  linear,
  scalePoints,
  stroke,
} from "../../core/geometry";
import { SURFACE, cat } from "../../core/theme";
import { stack } from "../../core/layout";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  Guides,
  SvgLegend,
  TickGrid,
  frame,
} from "../svg";

export type StackedAreaProps = BaseProps & {
  series: Series[];
  yTicks?: TickSpec;
  guides?: readonly Guide[];
};

export const StackedArea = forwardRef<SVGSVGElement, StackedAreaProps>(
  (
    {
      series,
      yTicks,
      guides,
      format = formatCompact,
      labels,
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
    const { totals, levels } = stack(series.map((s) => s.data));
    const max = upperBound([...totals], yTicks, guides);
    const yTickList = resolveTicks(yTicks, 0, max, "linear", format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      labels: Boolean(labels),
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, legendY, T } = F;
    const Y = linear(0, max, bottom, top);
    const X = (i: number) => {
      const n = series[0]?.data.length ?? 1;
      return left + (n > 1 ? (i / (n - 1)) * (right - left) : 0);
    };
    const scaled = levels.map((level) =>
      scalePoints(level, left, right, bottom, top, 0, max),
    );
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
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
        <ColumnHits
          count={series[0]?.data.length ?? 0}
          x0={left}
          x1={right}
          top={top}
          bottom={bottom}
        />
        {series.map((s, k) => (
          <path
            key={s.name}
            d={bandPath(scaled[k + 1]!, scaled[k]!)}
            fill={cat(k)}
            opacity="0.8"
            data-part="mark"
            data-series={s.name}
          />
        ))}
        {scaled.slice(1, -1).map((level, k) => (
          <path
            key={k}
            d={linePath(level)}
            fill="none"
            stroke={SURFACE}
            {...stroke.medium}
          />
        ))}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={series.map((s) => s.name)}
            colors={series.map((_, k) => cat(k))}
            y={legendY}
          />
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={scaled[0]!.map((p) => p.x)}
            y={axisY}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

StackedArea.displayName = "StackedArea";
