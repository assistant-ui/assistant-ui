import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import {
  ABSTRACT_TILES,
  TILE_SIZE,
  tileAt,
  tileCenter,
} from "../../core/tiles";
import { round } from "../../core/geometry";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, TXT, vbHeight } from "../svg";

export type FlowMapProps = BaseProps & {
  origin: { col: number; row: number; label?: string };
  routes: { col: number; row: number; value: number }[];
  tiles?: Tile[];
};

export const FlowMap = forwardRef<SVGSVGElement, FlowMapProps>(
  (
    {
      origin,
      routes,
      tiles = ABSTRACT_TILES,
      title,
      aspect,
      className,
      ...rest
    },
    ref,
  ) => {
    const vh = vbHeight(aspect, 5 / 3);
    const originTile = tileAt(tiles, origin.col, origin.row);
    const max = Math.max(...routes.map((r) => r.value), 1);
    return (
      <ChartSvg ref={ref} {...rest} vh={vh} title={title} className={className}>
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
        {originTile &&
          routes.map((route, i) => {
            const tile = tileAt(tiles, route.col, route.row);
            if (!tile) return null;
            const o = tileCenter(originTile);
            const t = tileCenter(tile);
            const mx = (o.x + t.x) / 2;
            const my = Math.min(o.y, t.y) - 14 - (route.value / max) * 22;
            const width = 1 + (route.value / max) * 1.8;
            const angle = Math.atan2(t.y - my, t.x - mx);
            const a1 = angle + Math.PI * 0.82;
            const a2 = angle - Math.PI * 0.82;
            const head = 4.5 + width;
            return (
              <g
                key={i}
                stroke={ACCENT}
                fill="none"
                data-part="mark"
                data-i={i}
              >
                <path
                  d={`M${round(o.x)} ${round(o.y)} Q${round(mx)} ${round(my)} ${round(t.x)} ${round(t.y)}`}
                  strokeWidth={round(width)}
                  opacity="0.75"
                  strokeLinecap="round"
                />
                <path
                  d={`M${round(t.x)} ${round(t.y)} L${round(t.x + head * Math.cos(a1))} ${round(t.y + head * Math.sin(a1))} M${round(t.x)} ${round(t.y)} L${round(t.x + head * Math.cos(a2))} ${round(t.y + head * Math.sin(a2))}`}
                  strokeWidth={round(width)}
                  opacity="0.75"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        {originTile && (
          <g data-part="mark">
            <circle
              cx={round(tileCenter(originTile).x)}
              cy={round(tileCenter(originTile).y)}
              r="4.5"
              fill={ACCENT}
            />
            {origin.label && (
              <text
                x={round(tileCenter(originTile).x)}
                y={round(tileCenter(originTile).y + 12)}
                textAnchor="middle"
                fontSize="3.2"
                fill={ACCENT}
                fontFamily={TXT.axis.fontFamily}
              >
                {origin.label}
              </text>
            )}
          </g>
        )}
        <text x="192" y={vh - 7} textAnchor="end" {...TXT.axis}>
          width = volume
        </text>
      </ChartSvg>
    );
  },
);

FlowMap.displayName = "FlowMap";
