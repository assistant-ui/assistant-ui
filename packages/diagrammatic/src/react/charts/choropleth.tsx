import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES } from "../../core/tiles";
import { ACCENT, seqOpacity } from "../../core/theme";
import { ChartSvg, typeScale, vbHeight } from "../svg";
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
      aspect,
      density,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const T = typeScale(density);
    const max = Math.max(...values, 1);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
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
        <g data-part="legend">
          {[0.1, 0.35, 0.65, 1].map((t, i) => (
            <rect
              key={i}
              x={128 + i * 11}
              y={vh - 12}
              width="8.5"
              height="6"
              fill={ACCENT}
              opacity={seqOpacity(t)}
            />
          ))}
          <text x="122" y={vh - 7} textAnchor="end" {...T.axis}>
            {legendLabel ? `${legendLabel}: low` : "low"}
          </text>
          <text x="174" y={vh - 7} {...T.axis}>
            high
          </text>
        </g>
      </ChartSvg>
    );
  },
);

Choropleth.displayName = "Choropleth";
