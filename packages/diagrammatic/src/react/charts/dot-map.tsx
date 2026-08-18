import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES, tileJitter } from "../../core/tiles";
import { ink } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";
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
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
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
          <TileMark
            key={`${tile.col}-${tile.row}`}
            tile={tile}
            fill={ink(0.06)}
            data-part="grid"
          />
        ))}
        {tiles.flatMap((tile, i) =>
          Array.from({ length: Math.max(0, counts[i] ?? 0) }, (_, k) => {
            const at = tileJitter(tile, k);
            return (
              <circle
                key={`${tile.col}-${tile.row}-${k}`}
                cx={at.x}
                cy={at.y}
                r="1.1"
                fill={ink(0.6)}
                data-part="mark"
                data-i={i}
              />
            );
          }),
        )}
        {unitLabel && (
          <text x="192" y={vh - 7} textAnchor="end" {...T.axis}>
            {unitLabel}
          </text>
        )}
      </ChartSvg>
    );
  },
);

DotMap.displayName = "DotMap";
