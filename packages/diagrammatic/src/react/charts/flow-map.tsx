import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES, tileAt, tileCenter } from "../../core/tiles";
import { round } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ACCENT, ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";
import { TileMark } from "../tile-mark";

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
    const originTile = tileAt(tiles, origin.col, origin.row);
    const max = Math.max(...routes.map((r) => r.value), 1);
    const originCenter = originTile ? tileCenter(originTile) : undefined;
    const originX = originCenter ? X(originCenter.x) : 0;
    const originY = originCenter ? Y(originCenter.y) : 0;
    const originLabel =
      origin.label && originTile
        ? truncate(
            origin.label,
            T.axis.px,
            Math.max(0, 2 * Math.min(originX - left, right - originX)),
          )
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
              fill={ink(0.08)}
              data-part="grid"
            />
          ))}
        </g>
        {originTile &&
          routes.map((route, i) => {
            const tile = tileAt(tiles, route.col, route.row);
            if (!tile) return null;
            const c = tileCenter(tile);
            const x = X(c.x);
            const y = Y(c.y);
            const mx = (originX + x) / 2;
            const my = Math.max(
              top + 6,
              Math.min(originY, y) - 16 - (route.value / max) * 28,
            );
            const width = 1.5 + (route.value / max) * 2.5;
            const angle = Math.atan2(y - my, x - mx);
            const a1 = angle + Math.PI * 0.82;
            const a2 = angle - Math.PI * 0.82;
            const head = 6 + width * 1.5;
            return (
              <g
                key={i}
                stroke={ACCENT}
                fill="none"
                data-part="mark"
                data-i={i}
              >
                <path
                  d={`M${originX} ${originY} Q${round(mx)} ${round(my)} ${x} ${y}`}
                  strokeWidth={round(width)}
                  opacity="0.75"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`M${x} ${y} L${round(x + head * Math.cos(a1))} ${round(y + head * Math.sin(a1))} M${x} ${y} L${round(x + head * Math.cos(a2))} ${round(y + head * Math.sin(a2))}`}
                  strokeWidth={round(width)}
                  opacity="0.75"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        {originTile && (
          <g data-part="mark">
            <circle cx={originX} cy={originY} r={6} fill={ACCENT} />
            {originLabel && (
              <text
                x={originX}
                y={Math.min(bottom, round(originY + 6 + T.axis.px))}
                textAnchor="middle"
                {...T.axis.attrs}
                fill={ACCENT}
              >
                {originLabel}
              </text>
            )}
          </g>
        )}
        <g data-part="legend">
          <text x={right} y={axisY} textAnchor="end" {...T.axis.attrs}>
            {truncate("width = volume", T.axis.px, right - left)}
          </text>
        </g>
      </ChartSvg>
    );
  },
);

FlowMap.displayName = "FlowMap";
