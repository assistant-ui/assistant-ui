import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES, TILE_SIZE } from "../../core/tiles";
import { ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

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
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
        {tiles.map((tile) => (
          <rect
            key={`${tile.col}-${tile.row}`}
            x={tile.x}
            y={tile.y}
            width={TILE_SIZE}
            height="10.8"
            fill={ink(0.06)}
            data-part="grid"
          />
        ))}
        {tiles.flatMap((tile, i) =>
          Array.from({ length: Math.max(0, counts[i] ?? 0) }, (_, k) => {
            const jx = ((tile.col * 7 + tile.row * 13 + k * 29) % 8) + 1.2;
            const jy = ((tile.col * 11 + tile.row * 5 + k * 17) % 7) + 1.6;
            return (
              <circle
                key={`${tile.col}-${tile.row}-${k}`}
                cx={tile.x + jx}
                cy={tile.y + jy}
                r="1.1"
                fill={ink(0.6)}
                data-part="mark"
                data-i={i}
              />
            );
          }),
        )}
        {unitLabel && (
          <text x="192" y={vh - 7} textAnchor="end" {...TXT.axis}>
            {unitLabel}
          </text>
        )}
      </ChartSvg>
    );
  },
);

DotMap.displayName = "DotMap";
