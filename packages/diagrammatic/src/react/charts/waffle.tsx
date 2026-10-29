import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { hexPath } from "../../core/geometry";
import { cat } from "../../core/theme";
import { ChartSvg, SvgLegend, frame } from "../svg";

export type WaffleProps = BaseProps & {
  items: Item[];
  mark?: "square" | "hex";
};

export const Waffle = forwardRef<SVGSVGElement, WaffleProps>(
  (
    {
      items,
      mark = "square",
      legend,
      format,
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
    const showLegend = legend ?? true;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      legend: showLegend,
    });
    const { left, right, top, bottom } = F;
    const values = items.map((r) => Math.max(0, r.value));
    const max = values.reduce((largest, value) => Math.max(largest, value), 0);
    const scaled = max > 0 ? values.map((value) => value / max) : values;
    const total = scaled.reduce((sum, value) => sum + value, 0) || 1;
    const exact = scaled.map((value) => (value / total) * 100);
    const shares = exact.map(Math.round);
    const drift = 100 - shares.reduce((a, b) => a + b, 0);
    if (drift !== 0 && shares.length > 0) {
      if (values.every((value) => value === 0)) {
        shares[0] = 100;
      } else {
        const order = exact
          .map((share, i) => ({ i, fraction: share - Math.floor(share) }))
          .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
        exact.forEach((share, i) => {
          shares[i] = Math.floor(share);
        });
        const remaining = 100 - shares.reduce((a, b) => a + b, 0);
        for (const { i } of order.slice(0, remaining)) shares[i]! += 1;
      }
    }
    const cells: number[] = [];
    shares.forEach((count, series) => {
      for (let i = 0; i < count; i += 1) cells.push(series);
    });
    const gap = Math.max(2, Math.round(F.T.axis.px * 0.25));
    const cell = Math.max(
      0,
      Math.min((right - left - gap * 9) / 10, (bottom - top - gap * 9) / 10),
    );
    const gridWidth = cell * 10 + gap * 9;
    const gridHeight = cell * 10 + gap * 9;
    const gridLeft = left + (right - left - gridWidth) / 2;
    const gridTop = top + (bottom - top - gridHeight) / 2;
    const hexRadius = Math.max(
      0,
      Math.min(
        (right - left - gap * 9.5) / (10.5 * Math.sqrt(3)),
        (bottom - top - gap * 9) / 15.5,
      ),
    );
    const hexWidth = Math.sqrt(3) * hexRadius;
    const hexPitchX = hexWidth + gap;
    const hexPitchY = 1.5 * hexRadius + gap;
    const hexGridWidth = 10 * hexWidth + 9 * gap + hexPitchX / 2;
    const hexGridHeight = 2 * hexRadius + 9 * hexPitchY;
    const hexLeft = left + (right - left - hexGridWidth) / 2;
    const hexTop = top + (bottom - top - hexGridHeight) / 2;
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {cells
          .slice(0, 100)
          .map((series, i) =>
            mark === "hex" ? (
              <path
                key={i}
                d={hexPath(
                  hexLeft +
                    hexWidth / 2 +
                    (i % 10) * hexPitchX +
                    ((Math.floor(i / 10) % 2) * hexPitchX) / 2,
                  hexTop + hexRadius + Math.floor(i / 10) * hexPitchY,
                  hexRadius,
                )}
                fill={cat(series)}
                opacity="0.88"
                data-part="mark"
                data-series={items[series]?.label}
              />
            ) : (
              <rect
                key={i}
                x={gridLeft + (i % 10) * (cell + gap)}
                y={gridTop + Math.floor(i / 10) * (cell + gap)}
                width={cell}
                height={cell}
                fill={cat(series)}
                opacity="0.88"
                data-part="mark"
                data-series={items[series]?.label}
              />
            ),
          )}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={items.map(
              (item, i) =>
                `${item.label} ${format ? format(item.value) : `${Math.round(exact[i]!)}%`}`,
            )}
            colors={items.map((_, i) => cat(i))}
          />
        )}
      </ChartSvg>
    );
  },
);

Waffle.displayName = "Waffle";
