import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { ring, rowMid } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { SURFACE, cat } from "../../core/theme";
import { ChartSvg, PAD, frame, resolveWidth, typeSize } from "../svg";

export type PieProps = BaseProps & {
  items: Item[];
  inner?: number;
  center?: string;
  centerLabel?: string;
};

const LEGEND_SHARE = 0.34;

export const Pie = forwardRef<SVGSVGElement, PieProps>(
  (
    {
      items,
      inner = 0,
      legend,
      format,
      title,
      width,
      height,
      aspect,
      fontSize,
      className,
      center,
      centerLabel,
      ...rest
    },
    ref,
  ) => {
    const showLegend = legend ?? true;
    const W = resolveWidth(width);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      right: showLegend ? W - PAD - Math.round(W * LEGEND_SHARE) : undefined,
    });
    const { left, right, top, bottom, legendY, T } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const radius = Math.max(1, Math.min(right - left, bottom - top) / 2 - 6);
    const ringStroke = Math.max(1, Math.round(radius * 0.014 * 100) / 100);
    const total = items.reduce((sum, r) => sum + r.value, 0) || 1;
    const fmt = format ?? ((v: number) => `${Math.round((v / total) * 100)}%`);
    const centerType = typeSize(T, Math.max(1, radius / 60));
    const centerLabelType = typeSize(T, Math.max(0.8, radius / 160));
    const legendWidth = Math.max(0, F.width - right - PAD);
    const swatch = Math.max(3, Math.round(T.axis.px * 0.35 * 100) / 100);
    const legendX = right + Math.min(12, Math.max(6, legendWidth * 0.08));
    const labelX = legendX + swatch * 2 + 5;
    const valueX = F.width - PAD;
    const widestValue = Math.max(
      0,
      ...items.map((slice) => textWidth(fmt(slice.value), T.value.px)),
    );
    const labelWidth = Math.max(0, valueX - labelX - widestValue - 10);
    const availableLegendHeight = Math.max(0, bottom - legendY);
    const rowH =
      availableLegendHeight / Math.max(1, items.length) < T.label.px + 8
        ? availableLegendHeight / Math.max(1, items.length)
        : T.label.px + 8;
    const legendTop =
      legendY + Math.max(0, (availableLegendHeight - rowH * items.length) / 2);
    let angle = 0;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {items.map((slice, i) => {
          const a0 = angle;
          angle += (slice.value / total) * Math.PI * 2;
          return (
            <path
              key={slice.label}
              d={ring(
                cx,
                cy,
                Math.max(inner * radius, 0.001),
                radius,
                a0,
                angle,
              )}
              fill={cat(i)}
              fillOpacity="0.9"
              stroke={SURFACE}
              strokeWidth={ringStroke}
              data-part="mark"
              data-i={i}
            />
          );
        })}
        {center && (
          <text
            x={cx}
            y={
              cy +
              (centerLabel ? -centerLabelType.px * 0.35 : centerType.px * 0.35)
            }
            textAnchor="middle"
            {...T.value.attrs}
            fontSize={centerType.fontSize}
          >
            {center}
          </text>
        )}
        {centerLabel && (
          <text
            x={cx}
            y={
              cy +
              (center ? centerType.px * 0.65 + 4 : centerLabelType.px * 0.35)
            }
            textAnchor="middle"
            {...T.axis.attrs}
            fontSize={centerLabelType.fontSize}
          >
            {centerLabel}
          </text>
        )}
        {showLegend && (
          <g data-part="legend">
            {items.map((slice, i) => {
              const y = rowMid(i, rowH, legendTop);
              const value = truncate(
                fmt(slice.value),
                T.value.px,
                Math.max(0, valueX - labelX - labelWidth - 6),
              );
              return (
                <g key={slice.label}>
                  <circle
                    cx={legendX + swatch}
                    cy={y}
                    r={swatch}
                    fill={cat(i)}
                  />
                  <text
                    x={labelX}
                    y={y}
                    dominantBaseline="central"
                    {...T.label.attrs}
                  >
                    {truncate(slice.label, T.label.px, labelWidth)}
                  </text>
                  <text
                    x={valueX}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="central"
                    {...T.value.attrs}
                  >
                    {value}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </ChartSvg>
    );
  },
);

Pie.displayName = "Pie";
