import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { linePath, polar, round, stroke } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import type { Series } from "../../core/types";
import { C, GRID } from "../../core/theme";
import { ChartSvg, PAD, SvgLegend, frame } from "../svg";

export type RadarProps = BaseProps & { axes: string[]; series: Series[] };

/** Compares at most two profiles; extra series are ignored by contract. */
export const Radar = forwardRef<SVGSVGElement, RadarProps>(
  (
    {
      axes,
      series,
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
    const shown = series.slice(0, 3);
    const colors = [C[0], C[2], C[4]];
    const showLegend = legend ?? shown.length > 1;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
    });
    const { left, right, top, bottom, T } = F;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const axisLabels = axes.map((axis) =>
      truncate(
        axis,
        T.axis.px,
        Math.max(0, Math.min(right - left, bottom - top) - 12),
      ),
    );
    const widestLabel = Math.max(
      0,
      ...axisLabels.map((axis) => textWidth(axis, T.axis.px)),
    );
    const labelGap = Math.max(6, T.axis.px / 2 + 1);
    const labelAllowance = Math.max(
      T.axis.px + labelGap,
      widestLabel + labelGap,
    );
    const radius = Math.max(
      0,
      Math.min(right - left, bottom - top) / 2 - labelAllowance,
    );
    const max = Math.max(...shown.flatMap((series) => series.data), 1);
    const vertex = (share: number, i: number) =>
      polar(
        cx,
        cy,
        share * radius,
        (i / Math.max(1, axes.length)) * Math.PI * 2 - Math.PI / 2,
      );
    const polygon = (values: number[]) =>
      `${linePath(
        values.slice(0, axes.length).map((value, i) => vertex(value / max, i)),
        false,
      )} Z`;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {[1, 0.66, 0.33].map((level) => (
          <path
            key={level}
            d={polygon(axes.map(() => level * max))}
            fill="none"
            stroke={GRID}
            data-part="grid"
            {...stroke.hair}
          />
        ))}
        {axisLabels.map((axis, i) => {
          const tip = vertex(1, i);
          const angle =
            (i / Math.max(1, axes.length)) * Math.PI * 2 - Math.PI / 2;
          const side = Math.cos(angle);
          const centeredExtent =
            (textWidth(axis, T.axis.px) * Math.abs(side) +
              T.axis.px * Math.abs(Math.sin(angle))) /
            2;
          const textAnchor =
            Math.abs(side) < 0.35 && centeredExtent <= labelGap
              ? "middle"
              : side > 0
                ? "start"
                : "end";
          const label = polar(cx, cy, radius + labelGap, angle);
          const fit =
            textAnchor === "start"
              ? F.width - PAD - label.x
              : textAnchor === "end"
                ? label.x - PAD
                : 2 * Math.min(label.x - PAD, F.width - PAD - label.x);
          return (
            <g key={`${axis}-${i}`} data-part="axis">
              <line
                x1={round(cx)}
                y1={round(cy)}
                x2={round(tip.x)}
                y2={round(tip.y)}
                stroke={GRID}
                {...stroke.hair}
              />
              <text
                x={round(label.x)}
                y={round(label.y)}
                textAnchor={textAnchor}
                dominantBaseline="central"
                {...T.axis.attrs}
              >
                {truncate(axis, T.axis.px, fit)}
              </text>
            </g>
          );
        })}
        {shown.map((series, k) => (
          <path
            key={series.name}
            d={polygon(series.data)}
            fill={colors[k]}
            fillOpacity={0.14}
            stroke={colors[k]}
            strokeLinejoin="round"
            data-part="mark"
            data-series={series.name}
            {...stroke.line}
          />
        ))}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={shown.map((series) => series.name)}
            colors={colors.slice(0, shown.length)}
          />
        )}
      </ChartSvg>
    );
  },
);

Radar.displayName = "Radar";
