import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import {
  bandPath,
  linePath,
  round,
  scalePoints,
  stroke,
} from "../../core/geometry";
import { SURFACE, cat, ink } from "../../core/theme";
import { stack } from "../../core/layout";
import {
  AxisLabels,
  ChartSvg,
  ColumnHits,
  Legend,
  TXT,
  vbHeight,
} from "../svg";

export type StackedAreaProps = BaseProps & {
  series: Series[];
  yTicks?: readonly { at: number; label: string }[];
};

export const StackedArea = forwardRef<SVGSVGElement, StackedAreaProps>(
  (
    { series, yTicks, labels, legend, title, aspect, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const showLegend = legend ?? series.length > 1;
    const top = showLegend ? 24 : 12;
    const bottom = labels ? vh - 16 : vh - 8;
    const { totals, levels } = stack(series.map((s) => s.data));
    const max = Math.max(
      ...totals,
      ...(yTicks?.map((tick) => tick.at) ?? []),
      1,
    );
    const Y = (v: number) => bottom - (v / max) * (bottom - top);
    const scaled = levels.map((level) =>
      scalePoints(level, 14, 186, bottom, top, 0, max),
    );
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {yTicks?.map((tick) => (
          <g key={tick.at} data-part="grid">
            <line
              x1="14"
              y1={round(Y(tick.at))}
              x2="186"
              y2={round(Y(tick.at))}
              stroke={ink(0.08)}
              {...stroke.hair}
            />
            <text
              x="12"
              y={round(Y(tick.at)) + 1.2}
              textAnchor="end"
              {...TXT.axis}
            >
              {tick.label}
            </text>
          </g>
        ))}
        <ColumnHits
          count={series[0]?.data.length ?? 0}
          x0={14}
          x1={186}
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
          />
        )}
        {labels && (
          <AxisLabels
            labels={labels}
            xs={scaled[0]!.map((p) => p.x)}
            y={vh - 4}
          />
        )}
      </ChartSvg>
    );
  },
);

StackedArea.displayName = "StackedArea";
