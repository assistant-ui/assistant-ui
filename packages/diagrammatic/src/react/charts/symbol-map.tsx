import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import {
  ABSTRACT_TILES,
  TILE_SIZE,
  tileAt,
  tileCenter,
} from "../../core/tiles";
import { round, stroke } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";

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
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const max = Math.max(...marks.map((m) => m.value), 1);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        {tiles.map((tile) => (
          <rect
            key={`${tile.col}-${tile.row}`}
            x={tile.x}
            y={tile.y}
            width={TILE_SIZE}
            height="10.8"
            fill={ink(0.08)}
            data-part="grid"
          />
        ))}
        {marks.map((mark, i) => {
          const tile = tileAt(tiles, mark.col, mark.row);
          if (!tile) return null;
          const c = tileCenter(tile);
          const r = 2.6 + Math.sqrt(mark.value / max) * 7;
          return (
            <g key={i} data-part="mark" data-i={i}>
              <circle
                cx={round(c.x)}
                cy={round(c.y)}
                r={round(r)}
                fill={ACCENT}
                fillOpacity="0.3"
                stroke={ACCENT}
                strokeOpacity="0.8"
                {...stroke.medium}
              />
              {mark.label && (
                <text
                  x={round(c.x)}
                  y={round(c.y - r - 3)}
                  textAnchor="middle"
                  {...T.axis}
                >
                  {mark.label}
                </text>
              )}
            </g>
          );
        })}
        <text x="192" y={vh - 7} textAnchor="end" {...T.axis}>
          {legendLabel}
        </text>
      </ChartSvg>
    );
  },
);

SymbolMap.displayName = "SymbolMap";
