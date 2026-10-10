import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { extent, round, stroke } from "../../core/geometry";
import { truncate } from "../../core/text";
import { GRID, cat } from "../../core/theme";
import { ChartSvg, SvgLegend, frame } from "../svg";

export type ParallelCoordinatesProps = BaseProps & {
  axes: string[];
  records: { name: string; values: number[] }[];
};

export const ParallelCoordinates = forwardRef<
  SVGSVGElement,
  ParallelCoordinatesProps
>(
  (
    {
      axes,
      records,
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
    const showLegend = legend ?? records.length > 1;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
    });
    const { left, right, top, bottom, T } = F;
    const xs = axes.map(
      (_, i) => left + (i * (right - left)) / Math.max(1, axes.length - 1),
    );
    const domains = axes.map((_, a) =>
      extent(records.map((record) => record.values[a] ?? 0)),
    );
    const Y = (value: number, a: number) => {
      const [lo, hi] = domains[a]!;
      return bottom - ((value - lo) / (hi - lo || 1)) * (bottom - top);
    };
    const axisY = Math.max(T.axis.px, top - 6);
    const axisWidth = (i: number) => {
      const x = xs[i] ?? left;
      if (i === 0) return right - x;
      if (i === axes.length - 1) return x - left;
      return Math.max(0, (right - left) / Math.max(1, axes.length - 1) - 4);
    };
    const axisAnchor = (i: number) =>
      i === 0 ? "start" : i === axes.length - 1 ? "end" : "middle";
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {axes.map((axis, a) => (
          <g key={axis} data-part="axis">
            <line
              x1={round(xs[a]!)}
              y1={top}
              x2={round(xs[a]!)}
              y2={bottom}
              stroke={GRID}
              {...stroke.hair}
            />
            <text
              x={round(xs[a]!)}
              y={round(axisY)}
              textAnchor={axisAnchor(a)}
              {...T.axis.attrs}
            >
              {truncate(axis, T.axis.px, axisWidth(a))}
            </text>
          </g>
        ))}
        {records.map((record, k) => (
          <g key={record.name} data-part="mark" data-series={record.name}>
            <path
              d={record.values
                .map(
                  (value, a) =>
                    `${a === 0 ? "M" : "L"}${round(xs[a] ?? left)} ${round(Y(value, a))}`,
                )
                .join(" ")}
              fill="none"
              stroke={cat(k)}
              opacity={0.8}
              strokeLinejoin="round"
              {...stroke.line}
            />
            {record.values.map((value, a) => (
              <circle
                key={a}
                cx={round(xs[a] ?? left)}
                cy={round(Y(value, a))}
                r={3}
                fill={cat(k)}
              />
            ))}
          </g>
        ))}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={records.map((record) => record.name)}
            colors={records.map((_, k) => cat(k))}
          />
        )}
      </ChartSvg>
    );
  },
);

ParallelCoordinates.displayName = "ParallelCoordinates";
