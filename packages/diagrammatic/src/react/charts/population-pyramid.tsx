import type { BaseProps } from "../svg";
import { linear, round, rowMarkH, rowMid } from "../../core/geometry";
import { forwardRef } from "react";
import type { Series } from "../../core/types";
import { C } from "../../core/theme";
import { textWidth, truncate } from "../../core/text";
import { ChartSvg, SvgLegend, frame } from "../svg";

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
    {
      bands,
      left: leftSeries,
      right: rightSeries,
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
    const showLegend = legend ?? true;
    const max = Math.max(...leftSeries.data, ...rightSeries.data, 1);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
    });
    const { left, right, top, bottom, legendY, T } = F;
    const rowH = (bottom - top) / Math.max(1, bands.length);
    const barH = rowMarkH(rowH, 0.58);
    const span = right - left;
    const widest = Math.max(
      0,
      ...bands.map((band) => textWidth(band, T.axis.px)),
    );
    const centerGap = Math.min(span, Math.max(24, widest + 12));
    const center = left + span / 2;
    const leftEnd = center - centerGap / 2;
    const rightStart = center + centerGap / 2;
    const W = linear(0, max, 0, Math.max(0, leftEnd - left));
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {showLegend && (
          <SvgLegend
            frame={F}
            names={[leftSeries.name, rightSeries.name]}
            colors={[C[0], C[2]]}
            x={right}
            anchor="end"
            y={legendY}
          />
        )}
        {bands.map((band, i) => {
          const mid = rowMid(i, rowH, top);
          const lw = W(leftSeries.data[i] ?? 0);
          const rw = W(rightSeries.data[i] ?? 0);
          return (
            <g key={band} data-part="mark" data-i={i}>
              <rect
                x={round(leftEnd - lw)}
                y={round(mid - barH / 2)}
                width={round(lw)}
                height={round(barH)}
                fill={C[0]}
                opacity="0.85"
                data-series={leftSeries.name}
              />
              <rect
                x={round(rightStart)}
                y={round(mid - barH / 2)}
                width={round(rw)}
                height={round(barH)}
                fill={C[2]}
                opacity="0.85"
                data-series={rightSeries.name}
              />
              <text
                x={round(center)}
                y={mid}
                textAnchor="middle"
                dominantBaseline="central"
                {...T.axis.attrs}
              >
                {truncate(band, T.axis.px, centerGap - 8)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

PopulationPyramid.displayName = "PopulationPyramid";
