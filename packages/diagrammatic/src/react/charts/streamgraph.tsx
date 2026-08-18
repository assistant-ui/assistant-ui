import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { bandPath, scalePoints } from "../../core/geometry";
import { cat, ink } from "../../core/theme";
import { stack } from "../../core/layout";
import {
  ChartSvg,
  ColumnHits,
  Legend,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type StreamgraphProps = BaseProps & {
  series: Series[];
  regions?: { from: number; to: number; label?: string }[];
};

export const Streamgraph = forwardRef<SVGSVGElement, StreamgraphProps>(
  (
    { series, regions, legend, title, aspect, density, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const showLegend = legend ?? series.length > 1;
    const { left, right, top, bottom } = plotFrame(vh, density, {
      legend: showLegend,
    });
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
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {regions?.map((region) => (
          <g
            key={`${region.from}-${region.to}`}
            data-part="region"
            data-series={region.label}
          >
            <rect
              x={X(region.from)}
              y={mid - half}
              width={Math.max(0, X(region.to) - X(region.from))}
              height={half * 2}
              fill={ink(density === "figure" ? 0.1 : 0.07)}
            />
            {region.label ? (
              <text
                x={X(region.from) + 2.5}
                y={mid - half + 8}
                {...T.axis}
                fill={ink(0.7)}
              >
                {region.label}
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
          <Legend
            names={series.map((s) => s.name)}
            colors={series.map((_, k) => cat(k))}
            x={8}
            type={T.axis}
          />
        )}
      </ChartSvg>
    );
  },
);

Streamgraph.displayName = "Streamgraph";
