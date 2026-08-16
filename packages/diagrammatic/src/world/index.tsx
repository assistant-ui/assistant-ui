import type { BaseProps } from "../react/svg";
import { forwardRef } from "react";
import { ACCENT, ink } from "../core/theme";
import { ChartSvg } from "../react/svg";
import { WORLD, WORLD_HEIGHT } from "./world-data";

export { WORLD, WORLD_HEIGHT, type WorldCountry } from "./world-data";
export { DotWorldMap, type DotWorldMapProps } from "./dot-map";
export { CENTROIDS } from "./world-dots";

export type WorldMapProps = BaseProps & {
  values?: Readonly<Record<string, number>>;
  max?: number;
};

/**
 * A real-geometry world choropleth: Natural Earth 110m country outlines,
 * Miller-projected and simplified offline into static path data, so the
 * component ships zero runtime geo code. Countries are addressed by ISO
 * 3166-1 alpha-2 in `values` and stamped as `data-series`, which plugs the
 * interactive layer's tooltips and highlighting in unchanged. This entry is
 * intentionally separate from the package root: the geometry weighs more
 * than every other chart combined, and only maps should pay for it.
 */
export const WorldMap = forwardRef<SVGSVGElement, WorldMapProps>(
  (
    {
      values,
      max,
      labels: _labels,
      legend: _legend,
      format: _format,
      aspect: _aspect,
      title,
      className,
      ...rest
    },
    ref,
  ) => {
    const top = Math.max(...Object.values(values ?? { z: 1 }), 1);
    const denominator = max ?? top;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={WORLD_HEIGHT}
        title={title}
        className={className}
      >
        {WORLD.map((country, i) => {
          const value = values?.[country.iso];
          const share =
            value === undefined
              ? undefined
              : Math.max(0, Math.min(1, value / denominator));
          return (
            <path
              key={`${country.iso}-${i}`}
              d={country.d}
              fill={ACCENT}
              fillOpacity={share === undefined ? 0 : 0.1 + share * 0.85}
              stroke={ink(0.25)}
              strokeWidth="0.2"
              data-part="mark"
              data-series={country.iso}
              style={
                share === undefined
                  ? { fill: "currentColor", fillOpacity: 0.06 }
                  : undefined
              }
            />
          );
        })}
      </ChartSvg>
    );
  },
);

WorldMap.displayName = "WorldMap";
