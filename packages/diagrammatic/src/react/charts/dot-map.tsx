import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Tile } from "../../core/tiles";
import { ABSTRACT_TILES, tileJitter, tileLayout } from "../../core/tiles";
import { round } from "../../core/geometry";
import { truncate } from "../../core/text";
import { ink } from "../../core/theme";
import { ChartSvg, frame } from "../svg";
import { TileMark } from "../tile-mark";

export type DotMapProps = BaseProps & {
  counts: number[];
  tiles?: Tile[];
  unit?: number;
  unitLabel?: string;
  maxDots?: number;
};

const DEFAULT_MAX_DOTS = 200;

function niceAtLeast(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  if (!(magnitude > 0) || !Number.isFinite(magnitude)) return value;
  const scaled = value / magnitude;
  const nice =
    (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * magnitude;
  return Number.isFinite(nice) ? nice : value;
}

function nextNiceUnit(unit: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(unit));
  const scaled = unit / magnitude;
  return (scaled < 2 ? 2 : scaled < 5 ? 5 : 10) * magnitude;
}

/** Scatters each tile's count as dots using a chart-wide unit and dot budget. */
export const DotMap = forwardRef<SVGSVGElement, DotMapProps>(
  (
    {
      counts,
      tiles = ABSTRACT_TILES,
      unit = 1,
      unitLabel,
      maxDots = DEFAULT_MAX_DOTS,
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
    const values = tiles.map((_, i) => {
      const count = counts[i] ?? 0;
      return Number.isFinite(count) && count > 0 ? count : 0;
    });
    const positiveTiles = values.filter((count) => count > 0).length;
    const budget = Math.max(
      positiveTiles,
      Number.isFinite(maxDots) && maxDots > 0
        ? Math.floor(maxDots)
        : DEFAULT_MAX_DOTS,
    );
    let dotUnit = Number.isFinite(unit) && unit > 0 ? unit : 1;
    const total = values.reduce((sum, count) => sum + count, 0);
    if (total / dotUnit > budget) {
      dotUnit = Math.max(
        dotUnit,
        niceAtLeast(Math.min(total / budget, Number.MAX_VALUE)),
      );
    }
    const dotsForUnit = (size: number) =>
      values.map((count) =>
        count > 0 ? Math.max(1, Math.round(count / size)) : 0,
      );
    let dotCounts = dotsForUnit(dotUnit);
    while (dotCounts.reduce((sum, count) => sum + count, 0) > budget) {
      const next = nextNiceUnit(dotUnit);
      if (!Number.isFinite(next) || next <= dotUnit) break;
      dotUnit = next;
      dotCounts = dotsForUnit(dotUnit);
    }
    const key = `1 dot = ${dotUnit}${unitLabel ? ` ${unitLabel}` : ""}`;
    const showUnit = dotUnit !== 1 || Boolean(unitLabel);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: showUnit,
    });
    const { left, right, axisY, T } = F;
    const { u, tx, ty } = tileLayout(tiles, F);
    const X = (x: number) => round(x * u + tx);
    const Y = (y: number) => round(y * u + ty);
    const shownUnit = showUnit
      ? truncate(key, T.axis.px, right - left)
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
          Array.from({ length: dotCounts[i] ?? 0 }, (_, k) => {
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
        {showUnit && (
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
