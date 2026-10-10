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

export type StackedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
  normalize?: boolean;
  yTicks?: TickSpec;
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
    const vertical = groups.length > 24;
    const totals = groups.map((_, g) =>
      series.reduce((sum, s) => sum + (s.data[g] ?? 0), 0),
    );
    const max = upperBound([...totals], yTicks, guides);
    const yTickList = resolveTicks(yTicks, 0, max, "linear", format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
      labels: true,
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const plotBottom = vertical ? bottom - 8 : bottom;
    const Y = linear(0, max, plotBottom, top);
    const step = (right - left) / Math.max(1, groups.length);
    const X = (i: number) => left + step * (i + 0.5);
    const barW = Math.min(48, step * 0.55);
    const centers = groups.map((_, g) => left + step * (g + 0.5));
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
          y1={plotBottom}
          x2={right}
          y2={plotBottom}
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
          bottom={plotBottom}
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
            const gap = k === 0 ? 0 : Math.min(2, barW * 0.12);
            const y = cursor - h;
            const x = centers[g]! - barW / 2;
            const segment = (
              <rect
                key={`${g}-${k}`}
                x={round(x)}
                y={round(y - gap)}
                width={round(barW)}
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
          y={vertical ? plotBottom + 4 : axisY}
          vertical={vertical}
          type={T.axis}
        />
      </ChartSvg>
    );
  },
);

StackedBar.displayName = "StackedBar";
