import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES, tileJitter } from "../../core/tiles";
import { round } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";
import { TileMark } from "../tile-mark";

export type DotMapProps = BaseProps & {
  counts: number[];
  tiles?: Tile[];
  unitLabel?: string;
};

/** `counts[i]` scatters that many dots inside `tiles[i]`, deterministically. */
export const DotMap = forwardRef<SVGSVGElement, DotMapProps>(
  (
    {
      counts,
      tiles = ABSTRACT_TILES,
      unitLabel,
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
      labels: Boolean(unitLabel),
    });
    const { left, right, top, bottom, axisY, T } = F;
    const u = Math.min((right - left) / 200, (bottom - top) / 120);
    const tx = left + (right - left - 200 * u) / 2;
    const ty = top + (bottom - top - 120 * u) / 2;
    const X = (x: number) => round(x * u + tx);
    const Y = (y: number) => round(y * u + ty);
    const shownUnit = unitLabel
      ? truncate(unitLabel, T.axis.px, right - left)
      : undefined;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <g transform={`translate(${round(tx)} ${round(ty)}) scale(${u})`}>
          {tiles.map((tile) => (
            <TileMark
              key={`${tile.col}-${tile.row}`}
              tile={tile}
              fill={ink(0.06)}
              data-part="grid"
            />
          ))}
        </g>
        {tiles.flatMap((tile, i) =>
          Array.from({ length: Math.max(0, counts[i] ?? 0) }, (_, k) => {
            const at = tileJitter(tile, k);
            return (
              <circle
                key={`${tile.col}-${tile.row}-${k}`}
                cx={X(at.x)}
                cy={Y(at.y)}
                r={3}
                fill={ink(0.6)}
                data-part="mark"
                data-i={i}
              />
            );
          }),
        )}
        {unitLabel && (
          <g data-part="legend">
            <text x={right} y={axisY} textAnchor="end" {...T.axis.attrs}>
              {shownUnit}
            </text>
          </g>
        )}
      </ChartSvg>
    );
  },
);

DotMap.displayName = "DotMap";
