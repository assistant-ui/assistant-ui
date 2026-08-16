import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { bandPath, scalePoints } from "../../core/geometry";
import { cat } from "../../core/theme";
import { stack } from "../../core/layout";
import { ChartSvg, ColumnHits, Legend, vbHeight } from "../svg";

export type StreamgraphProps = BaseProps & { series: Series[] };

export const Streamgraph = forwardRef<SVGSVGElement, StreamgraphProps>(
  ({ series, legend, title, aspect, className, ...rest }, ref) => {
    const vh = vbHeight(aspect, 5 / 3);
    const showLegend = legend ?? series.length > 1;
    const { totals, levels } = stack(series.map((s) => s.data));
    const max = Math.max(...totals, 1);
    const centered = levels.map((level) =>
      level.map((v, i) => v - totals[i]! / 2),
    );
    const mid = showLegend ? vh / 2 + 5 : vh / 2;
    const half = (vh - (showLegend ? 30 : 16)) / 2;
    const scaled = centered.map((level) =>
      scalePoints(level, 8, 192, mid + half, mid - half, -max / 2, max / 2),
    );
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        <ColumnHits
          count={series[0]?.data.length ?? 0}
          x0={14}
          x1={186}
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
          />
        )}
      </ChartSvg>
    );
  },
);

Streamgraph.displayName = "Streamgraph";
