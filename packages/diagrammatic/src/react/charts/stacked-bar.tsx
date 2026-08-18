import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, Series, Tick } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { GRID, cat } from "../../core/theme";
import {
  AxisLabels,
  ChartSvg,
  Legend,
  Guides,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type StackedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
  normalize?: boolean;
  yTicks?: readonly Tick[];
  guides?: readonly Guide[];
};

export const StackedBar = forwardRef<SVGSVGElement, StackedBarProps>(
  (
    {
      groups,
      series,
      normalize,
      yTicks,
      guides,
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
    const vertical = groups.length > 24;
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      legend: showLegend,
      labels: true,
      ticks: Boolean(yTicks?.length),
    });
    const plotBottom = vertical ? bottom - 10 : bottom;
    const totals = groups.map((_, g) =>
      series.reduce((sum, s) => sum + (s.data[g] ?? 0), 0),
    );
    const max = Math.max(
      ...totals,
      ...(yTicks?.map((tick) => tick.at) ?? []),
      ...(guides?.map((g) => g.at) ?? []),
      1,
    );
    const Y = linear(0, max, plotBottom, top);
    const step = (right - left) / Math.max(1, groups.length);
    const X = (i: number) => left + step * (i + 0.5);
    const width = Math.min(20, step * 0.55);
    const centers = groups.map((_, g) => left + step * (g + 0.5));
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
          y1={plotBottom}
          x2={right}
          y2={plotBottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <TickGrid ticks={yTicks} at={Y} from={left} to={right} type={T.axis} />
        <Guides
          guides={guides}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={plotBottom}
          type={T.axis}
        />
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
            x={round(centers[g]! - step / 2)}
            y={top}
            width={round(step)}
            height={plotBottom - top}
            fill="transparent"
            data-part="mark"
            data-i={g}
          />
        ))}
        {groups.map((_, g) => {
          let cursor = plotBottom;
          const denominator = normalize ? totals[g] || 1 : max;
          return series.map((s, k) => {
            const v = s.data[g] ?? 0;
            const h = (v / denominator) * (plotBottom - top);
            const gap = k === 0 ? 0 : Math.min(1.6, width * 0.12);
            const y = cursor - h;
            const x = centers[g]! - width / 2;
            const segment = (
              <rect
                key={`${g}-${k}`}
                x={round(x)}
                y={round(y - gap)}
                width={round(width)}
                height={round(h)}
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
        <AxisLabels
          labels={groups}
          xs={centers}
          y={vertical ? plotBottom + 5 : axisY}
          vertical={vertical}
          type={T.axis}
        />
      </ChartSvg>
    );
  },
);

StackedBar.displayName = "StackedBar";
