import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { bandPath, round, scalePoints } from "../../core/geometry";
import { truncate } from "../../core/text";
import { cat, ink } from "../../core/theme";
import { stack } from "../../core/layout";
import { ChartSvg, ColumnHits, SvgLegend, frame } from "../svg";

export type StreamgraphProps = BaseProps & {
  series: Series[];
  regions?: { from: number; to: number; label?: string }[];
};

export const Streamgraph = forwardRef<SVGSVGElement, StreamgraphProps>(
  (
    {
      series,
      regions,
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
    });
    const { left, right, top, bottom, legendY, T } = F;
    const { totals, levels } = stack(series.map((s) => s.data));
    const max = Math.max(...totals, 1);
    const centered = levels.map((level) =>
      level.map((v, i) => v - totals[i]! / 2),
    );
    const mid = (top + bottom) / 2;
    const half = (bottom - top) / 2;
    const scaled = centered.map((level) =>
      scalePoints(
        level,
        left,
        right,
        mid + half,
        mid - half,
        -max / 2,
        max / 2,
      ),
    );
    const n = Math.max(1, (series[0]?.data.length ?? 1) - 1);
    const X = (i: number) =>
      left + (Math.max(0, Math.min(n, i)) / n) * (right - left);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {regions?.map((region) => (
          <g
            key={`${region.from}-${region.to}`}
            data-part="region"
            data-series={region.label}
          >
            <rect
              x={round(X(region.from))}
              y={round(top)}
              width={round(Math.max(0, X(region.to) - X(region.from)))}
              height={round(bottom - top)}
              fill={ink(0.07)}
            />
            {region.label ? (
              <text
                x={round(X(region.from)) + 5}
                y={round(top + T.label.px - 2)}
                {...T.label.attrs}
                fill={ink(0.7)}
              >
                {truncate(
                  region.label,
                  T.label.px,
                  Math.max(0, right - (X(region.from) + 5)),
                )}
              </text>
            ) : null}
          </g>
        ))}
        <ColumnHits
          count={series[0]?.data.length ?? 0}
          x0={left}
          x1={right}
          top={mid - half}
          bottom={mid + half}
        />
        {series.map((s, k) => (
          <path
            key={s.name}
            d={bandPath(scaled[k + 1]!, scaled[k]!)}
            fill={cat(k)}
            opacity="0.75"
            data-part="mark"
            data-series={s.name}
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
      </ChartSvg>
    );
  },
);

Streamgraph.displayName = "Streamgraph";
