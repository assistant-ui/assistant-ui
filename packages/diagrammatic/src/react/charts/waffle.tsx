import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item } from "../../core/types";
import { cat } from "../../core/theme";
import { ChartSvg, SvgLegend, frame } from "../svg";

export type WaffleProps = BaseProps & { items: Item[] };

export const Waffle = forwardRef<SVGSVGElement, WaffleProps>(
  (
    {
      items,
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
    const total = items.reduce((sum, r) => sum + r.value, 0) || 1;
    const shares = items.map((r) => Math.round((r.value / total) * 100));
    const drift = 100 - shares.reduce((a, b) => a + b, 0);
    if (shares.length > 0) shares[0]! += drift;
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
    const fmt = format ?? ((v: number) => `${Math.round((v / total) * 100)}%`);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        {cells.slice(0, 100).map((series, i) => (
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
        ))}
        {showLegend && (
          <SvgLegend
            frame={F}
            names={items.map((item) => `${item.label} ${fmt(item.value)}`)}
            colors={items.map((_, i) => cat(i))}
          />
        )}
      </ChartSvg>
    );
  },
);

Waffle.displayName = "Waffle";
