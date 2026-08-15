import type { BaseProps, Series } from "../../core/types";
import { barPath } from "../../core/geometry";
import { C } from "../../core/theme";
import { ChartSvg, Legend, TXT, vbHeight } from "../svg";

export type PopulationPyramidProps = BaseProps & {
  bands: string[];
  left: Series;
  right: Series;
};

export function PopulationPyramid({
  bands,
  left,
  right,
  legend,
  title,
  aspect,
  className,
}: PopulationPyramidProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const showLegend = legend ?? true;
  const top = showLegend ? 16 : 8;
  const max = Math.max(...left.data, ...right.data, 1);
  const rowH = (vh - top - 6) / Math.max(1, bands.length);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
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
            <path
              d={barPath(90 - lw, y, lw, rowH - 3.2, 2.5, "left")}
              fill={C[0]}
              opacity="0.85"
              data-series={left.name}
            />
            <path
              d={barPath(110, y, rw, rowH - 3.2, 2.5, "right")}
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
}
