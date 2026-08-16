import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { round, stroke } from "../../core/geometry";
import { GRID, cat, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, Legend, TXT, vbHeight } from "../svg";

export type StackedBarProps = BaseProps & {
  groups: string[];
  series: Series[];
  normalize?: boolean;
  yTicks?: readonly { at: number; label: string }[];
};

export const StackedBar = forwardRef<SVGSVGElement, StackedBarProps>(
  (
    {
      groups,
      series,
      normalize,
      yTicks,
      legend,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const showLegend = legend ?? series.length > 1;
    const top = showLegend ? 26 : 14;
    const vertical = groups.length > 24;
    const bottom = vertical ? vh - 26 : vh - 16;
    const leftEdge = 14;
    const totals = groups.map((_, g) =>
      series.reduce((sum, s) => sum + (s.data[g] ?? 0), 0),
    );
    const max = Math.max(
      ...totals,
      ...(yTicks?.map((tick) => tick.at) ?? []),
      1,
    );
    const Y = (at: number) => bottom - (at / max) * (bottom - top);
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
        {yTicks?.map((tick) => (
          <g key={tick.at} data-part="grid">
            <line
              x1={leftEdge}
              y1={round(Y(tick.at))}
              x2="190"
              y2={round(Y(tick.at))}
              stroke={ink(0.08)}
              {...stroke.hair}
            />
            <text
              x={leftEdge - 2}
              y={round(Y(tick.at)) + 1.2}
              textAnchor="end"
              {...TXT.axis}
            >
              {tick.label}
            </text>
          </g>
        ))}
        {showLegend && (
          <Legend
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
            height={bottom - top}
            fill="transparent"
            data-part="mark"
            data-i={g}
          />
        ))}
        {groups.map((_, g) => {
          let cursor = bottom;
          const denominator = normalize ? totals[g] || 1 : max;
          return series.map((s, k) => {
            const v = s.data[g] ?? 0;
            const h = (v / denominator) * (bottom - top);
            const gap = k === 0 ? 0 : Math.min(1.6, width * 0.12);
            const y = cursor - h;
            const x = centers[g]! - width / 2;
            const segment =
              k === series.length - 1 ? (
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
              ) : (
                <rect
                  key={`${g}-${k}`}
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
        <AxisLabels
          labels={groups}
          xs={centers}
          y={vertical ? bottom + 5 : vh - 4}
          vertical={vertical}
        />
      </ChartSvg>
    );
  },
);

StackedBar.displayName = "StackedBar";
