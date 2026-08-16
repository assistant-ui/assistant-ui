import type { BaseProps } from "../svg";
import { linear, round, rowMarkH, rowMid } from "../../core/geometry";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { C } from "../../core/theme";
import { ChartSvg, Legend, plotFrame, typeScale, vbHeight } from "../svg";

export type PopulationPyramidProps = BaseProps & {
  bands: string[];
  left: Series;
  right: Series;
};

export const PopulationPyramid = forwardRef<
  SVGSVGElement,
  PopulationPyramidProps
>(
  (
    { bands, left, right, legend, title, aspect, density, className, ...rest },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const showLegend = legend ?? true;
    const { top, bottom } = plotFrame(vh, density, { legend: showLegend });
    const max = Math.max(...left.data, ...right.data, 1);
    const rowH = (bottom - top) / Math.max(1, bands.length);
    const barH = rowMarkH(rowH, 0.58);
    const W = linear(0, max, 0, 80);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {showLegend && (
          <Legend
            names={[left.name, right.name]}
            colors={[C[0], C[2]]}
            x={100 - 2}
            anchor="end"
            y={10}
            type={T.axis}
          />
        )}
        {bands.map((band, i) => {
          const mid = rowMid(i, rowH, top);
          const lw = W(left.data[i] ?? 0);
          const rw = W(right.data[i] ?? 0);
          return (
            <g key={band} data-part="mark" data-i={i}>
              <rect
                x={round(90 - lw)}
                y={round(mid - barH / 2)}
                width={round(lw)}
                height={round(barH)}
                fill={C[0]}
                opacity="0.85"
                data-series={left.name}
              />
              <rect
                x="110"
                y={round(mid - barH / 2)}
                width={round(rw)}
                height={round(barH)}
                fill={C[2]}
                opacity="0.85"
                data-series={right.name}
              />
              <text
                x="100"
                y={mid}
                textAnchor="middle"
                dominantBaseline="central"
                {...T.axis}
              >
                {band}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

PopulationPyramid.displayName = "PopulationPyramid";
