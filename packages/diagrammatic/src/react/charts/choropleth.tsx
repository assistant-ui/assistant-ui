import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES } from "../../core/tiles";
import { round } from "../../core/geometry";
import { textWidth, truncate } from "../../core/text";
import { ACCENT, seqOpacity } from "../../core/theme";
import { ChartSvg, frame } from "../svg";
import { TileMark } from "../tile-mark";

export type ChoroplethProps = BaseProps & {
  values: number[];
  tiles?: Tile[];
  legendLabel?: string;
};

/** `values[i]` colors `tiles[i]`; the default grid is the abstract landmass. */
export const Choropleth = forwardRef<SVGSVGElement, ChoroplethProps>(
  (
    {
      values,
      tiles = ABSTRACT_TILES,
      legendLabel,
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
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const u = Math.min((right - left) / 200, (bottom - top) / 120);
    const tx = left + (right - left - 200 * u) / 2;
    const ty = top + (bottom - top - 120 * u) / 2;
    const max = Math.max(...values, 1);
    const low = legendLabel ? `${legendLabel}: low` : "low";
    const swatchW = 12;
    const swatchGap = 3;
    const swatchesW = swatchW * 4 + swatchGap * 3;
    const high = "high";
    const highW = textWidth(high, T.axis.px);
    const shownLow = truncate(
      low,
      T.axis.px,
      Math.max(0, right - left - swatchesW - highW - 16),
    );
    const swatchX = left + textWidth(shownLow, T.axis.px) + 6;
    const highX = swatchX + swatchesW + 6;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <g transform={`translate(${round(tx)} ${round(ty)}) scale(${u})`}>
          {tiles.map((tile, i) => (
            <TileMark
              key={`${tile.col}-${tile.row}`}
              tile={tile}
              fill={ACCENT}
              opacity={seqOpacity((values[i] ?? 0) / max)}
              data-part="mark"
              data-i={i}
            />
          ))}
        </g>
        <g data-part="legend">
          {[0.1, 0.35, 0.65, 1].map((t, i) => (
            <rect
              key={i}
              x={round(swatchX + i * (swatchW + swatchGap))}
              y={round(axisY - T.axis.px * 0.8)}
              width={swatchW}
              height={Math.round(T.axis.px * 0.55)}
              fill={ACCENT}
              opacity={seqOpacity(t)}
            />
          ))}
          <text x={left} y={axisY} {...T.axis.attrs}>
            {shownLow}
          </text>
          <text x={round(highX)} y={axisY} {...T.axis.attrs}>
            high
          </text>
        </g>
      </ChartSvg>
    );
  },
);

Choropleth.displayName = "Choropleth";
