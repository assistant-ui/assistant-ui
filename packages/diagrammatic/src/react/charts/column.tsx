import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Item, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { ChartSvg, TickGrid, plotFrame, typeScale, vbHeight } from "../svg";

export type ColumnProps = BaseProps & {
  items: Item[];
  highlight?: "max" | "last" | string;
  categorical?: boolean;
  values?: boolean;
  yTicks?: readonly Tick[];
  target?: { at: number; label?: string };
};

/**
 * `categorical` colors each item as its own entity from the token palette;
 * `values` prints every value, not only the highlighted one.
 */
export const Column = forwardRef<SVGSVGElement, ColumnProps>(
  (
    {
      items,
      highlight = "last",
      categorical,
      values,
      yTicks,
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
      labels: true,
      ticks: Boolean(yTicks?.length),
    });
    const max = Math.max(
      ...items.map((r) => r.value),
      ...(yTicks?.map((tick) => tick.at) ?? []),
      ...(target ? [target.at] : []),
      1,
    );
    const Y = linear(0, max, bottom, top);
    const highest = Math.max(...items.map((r) => r.value));
    const step = (right - left) / Math.max(1, items.length);
    const width = Math.min(16, step * 0.62);
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
          y1={bottom}
          x2={right}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
        <TickGrid ticks={yTicks} at={Y} from={left} to={right} type={T.axis} />
        {target && (
          <g data-part="grid">
            <line
              x1={left}
              y1={round(Y(target.at))}
              x2={right}
              y2={round(Y(target.at))}
              stroke={ink(0.45)}
              strokeDasharray="2.5 3"
              {...stroke.hair}
            />
            {target.label && (
              <text
                x={right}
                y={round(Y(target.at)) - 2}
                textAnchor="end"
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
            x={round(left + step * i)}
            y={top}
            width={round(step)}
            height={bottom - top}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {items.map((row, i) => {
          const x = left + step * (i + 0.5) - width / 2;
          const h = bottom - Y(row.value);
          const accent =
            highlight === "last"
              ? i === items.length - 1
              : highlight === "max"
                ? row.value === highest
                : row.label === highlight;
          return (
            <g key={`${row.label}-${i}`} data-part="mark" data-i={i}>
              <rect
                x={round(x)}
                y={round(bottom - h)}
                width={round(width)}
                height={round(h)}
                fill={categorical ? cat(i) : accent ? ACCENT : ink(0.3)}
                opacity={categorical ? 0.9 : 1}
              />
              {(values || (!categorical && accent)) && (
                <text
                  x={x + width / 2}
                  y={bottom - h - 4}
                  textAnchor="middle"
                  {...T.value}
                >
                  {format(row.value)}
                </text>
              )}
              <text x={x + width / 2} y={axisY} textAnchor="middle" {...T.axis}>
                {row.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Column.displayName = "Column";
