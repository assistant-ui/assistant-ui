import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES, tileAt, tileCenter } from "../../core/tiles";
import { round, stroke } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";
import { TileMark } from "../tile-mark";

export type SymbolMapProps = BaseProps & {
  marks: { col: number; row: number; value: number; label?: string }[];
  tiles?: Tile[];
  legendLabel?: string;
};

export const SymbolMap = forwardRef<SVGSVGElement, SymbolMapProps>(
  (
    {
      marks,
      tiles = ABSTRACT_TILES,
      legendLabel = "circle = value",
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
    const X = (x: number) => round(x * u + tx);
    const Y = (y: number) => round(y * u + ty);
    const max = Math.max(...marks.map((m) => m.value), 1);
    const shownLegend = truncate(legendLabel, T.axis.px, right - left);
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
              fill={ink(0.08)}
              data-part="grid"
            />
          ))}
        </g>
        {marks.map((mark, i) => {
          const tile = tileAt(tiles, mark.col, mark.row);
          if (!tile) return null;
          const c = tileCenter(tile);
          const x = X(c.x);
          const y = Y(c.y);
          const r = 4 + Math.sqrt(mark.value / max) * 12;
          return (
            <g key={i} data-part="mark" data-i={i}>
              <circle
                cx={x}
                cy={y}
                r={round(r)}
                fill={ACCENT}
                fillOpacity="0.3"
                stroke={ACCENT}
                strokeOpacity="0.8"
                {...stroke.medium}
              />
              {mark.label && (
                <text
                  x={x}
                  y={Math.max(T.axis.px, round(y - r - 5))}
                  textAnchor="middle"
                  {...T.axis.attrs}
                >
                  {truncate(
                    mark.label,
                    T.axis.px,
                    Math.max(0, 2 * Math.min(x - left, right - x)),
                  )}
                </text>
              )}
            </g>
          );
        })}
        <g data-part="legend">
          <text x={right} y={axisY} textAnchor="end" {...T.axis.attrs}>
            {shownLegend}
          </text>
        </g>
      </ChartSvg>
    );
  },
);

SymbolMap.displayName = "SymbolMap";
