import type { BaseProps } from "../svg";
import { round } from "../../core/geometry";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { C } from "../../core/theme";
import { ChartSvg, Legend, TXT, vbHeight } from "../svg";

export type PopulationPyramidProps = BaseProps & {
  bands: string[];
  left: Series;
  right: Series;
};

export const PopulationPyramid = forwardRef<
  SVGSVGElement,
  PopulationPyramidProps
>(({ bands, left, right, legend, title, aspect, className, ...rest }, ref) => {
  const vh = vbHeight(aspect, 5 / 3);
  const showLegend = legend ?? true;
  const top = showLegend ? 16 : 8;
  const max = Math.max(...left.data, ...right.data, 1);
  const rowH = (vh - top - 6) / Math.max(1, bands.length);
  return (
    <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
      {showLegend && (
        <Legend
          names={[left.name, right.name]}
          colors={[C[0], C[2]]}
          x={100 - 2}
          anchor="end"
          y={10}
        />
      )}
      {bands.map((band, i) => {
        const y = top + i * rowH;
        const lw = ((left.data[i] ?? 0) / max) * 80;
        const rw = ((right.data[i] ?? 0) / max) * 80;
        return (
          <g key={band} data-part="mark" data-i={i}>
            <rect
              x={round(90 - lw)}
              y={round(y)}
              width={round(lw)}
              height={round(rowH - 3.2)}
              fill={C[0]}
              opacity="0.85"
              data-series={left.name}
            />
            <rect
              x="110"
              y={round(y)}
              width={round(rw)}
              height={round(rowH - 3.2)}
              fill={C[2]}
              opacity="0.85"
              data-series={right.name}
            />
            <text
              x="100"
              y={y + rowH / 2 + 0.6}
              textAnchor="middle"
              {...TXT.axis}
            >
              {band}
            </text>
          </g>
        );
      })}
    </ChartSvg>
  );
});

PopulationPyramid.displayName = "PopulationPyramid";
