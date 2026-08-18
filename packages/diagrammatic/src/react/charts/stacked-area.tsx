import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, Series, Tick } from "../../core/types";
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
  Legend,
  Guides,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type StackedAreaProps = BaseProps & {
  series: Series[];
  yTicks?: readonly Tick[];
  guides?: readonly Guide[];
};

export const StackedArea = forwardRef<SVGSVGElement, StackedAreaProps>(
  (
    {
      series,
      yTicks,
      guides,
      labels,
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
      labels: Boolean(labels),
      ticks: Boolean(yTicks?.length),
    });
    const { totals, levels } = stack(series.map((s) => s.data));
    const max = Math.max(
      ...totals,
      ...(yTicks?.map((tick) => tick.at) ?? []),
      ...(guides?.map((g) => g.at) ?? []),
      1,
    );
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
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <TickGrid ticks={yTicks} at={Y} from={left} to={right} type={T.axis} />
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
          <Legend
            names={series.map((s) => s.name)}
            colors={series.map((_, k) => cat(k))}
            type={T.axis}
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
