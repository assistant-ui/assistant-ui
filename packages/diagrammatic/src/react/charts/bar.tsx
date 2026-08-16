import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, rowMarkH, rowMid, stroke } from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { ChartSvg, TickGrid, plotFrame, typeScale, vbHeight } from "../svg";

export type BarProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
  categorical?: boolean;
  xTicks?: readonly Tick[];
  target?: { at: number; label?: string };
};

export const Bar = forwardRef<SVGSVGElement, BarProps>(
  (
    {
      items,
      highlight = "max",
      categorical,
      xTicks,
      target,
      format = formatCompact,
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
    const { left, right, top, bottom, axisY } = plotFrame(vh, density, {
      labels: Boolean(xTicks?.length),
      left: density === "figure" ? 50 : 44,
    });
    const max = Math.max(
      ...items.map((r) => r.value),
      ...(xTicks?.map((tick) => tick.at) ?? []),
      ...(target ? [target.at] : []),
      1,
    );
    const X = linear(0, max, left, right - 16);
    const highest = Math.max(...items.map((r) => r.value));
    const rowH = (bottom - top) / Math.max(1, items.length);
    const barH = rowMarkH(rowH, 0.55);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
        <line
          x1={left}
          y1={top}
          x2={left}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <TickGrid
          ticks={xTicks}
          at={X}
          from={top}
          to={bottom}
          axis="x"
          labelAt={axisY}
          type={T.axis}
        />
        {target && (
          <g data-part="grid">
            <line
              x1={round(X(target.at))}
              y1={top}
              x2={round(X(target.at))}
              y2={bottom}
              stroke={ink(0.45)}
              strokeDasharray="2.5 3"
              {...stroke.hair}
            />
            {target.label && (
              <text
                x={round(X(target.at))}
                y={top - 3}
                textAnchor="middle"
                {...T.axis}
                fill={ink(0.8)}
              >
                {target.label}
              </text>
            )}
          </g>
        )}
        {items.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={left}
            y={round(top + i * rowH)}
            width={right - left}
            height={round(rowH)}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {items.map((row, i) => {
          const mid = rowMid(i, rowH, top);
          const w = Math.max(X(row.value) - left, 2);
          const accent =
            highlight === "max"
              ? row.value === highest
              : row.label === highlight;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 4}
                y={mid}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label}
              >
                {row.label}
              </text>
              <rect
                x={left}
                y={round(mid - barH / 2)}
                width={round(w)}
                height={round(barH)}
                fill={categorical ? cat(i) : accent ? ACCENT : ink(0.3)}
                opacity={categorical ? 0.9 : 1}
              />
              <text
                x={left + w + 4}
                y={mid}
                dominantBaseline="central"
                {...T.axis}
              >
                {format(row.value)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Bar.displayName = "Bar";
