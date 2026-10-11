import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import {
  type TickSpec,
  resolveTicks,
  tickValues,
  wantsTicks,
} from "../../core/scale";
import type { Guide, Item, ScaleKind } from "../../core/types";
import { formatCompact } from "../../core/types";
import { positiveExtent, project, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { ChartSvg, Guides, TickGrid, frame } from "../svg";

export type ColumnProps = BaseProps & {
  items: Item[];
  highlight?: "max" | "last" | string;
  categorical?: boolean;
  values?: boolean;
  yScale?: ScaleKind;
  yTicks?: TickSpec;
  target?: { at: number; label?: string };
  guides?: readonly Guide[];
};

/** The widest a column grows, in pixels, so a figure with two items is not two slabs. */
const MAX_COLUMN = 48;

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
      yScale = "linear",
      yTicks,
      target,
      guides,
      format = formatCompact,
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
    const yValues = [
      ...items.map((r) => r.value),
      ...tickValues(yTicks),
      ...(target ? [target.at] : []),
      ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
        []),
    ];
    const [yLo, yHi] =
      yScale === "log" ? positiveExtent(yValues) : [0, Math.max(...yValues, 1)];
    const yTickList = resolveTicks(yTicks, yLo, yHi, yScale, format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      ticks: wantsTicks(yTicks) ? (yTickList ?? true) : false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = project(yScale, yLo, yHi, bottom, top);
    const step = (right - left) / Math.max(1, items.length);
    const X = (i: number) => left + (i + 0.5) * step;
    const highest = Math.max(...items.map((r) => r.value));
    const columnW = Math.min(MAX_COLUMN, step * 0.62);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
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
        <TickGrid
          ticks={yTickList}
          at={Y}
          from={left}
          to={right}
          type={T.axis}
        />
        <Guides
          guides={[
            ...(target
              ? [
                  {
                    at: target.at,
                    axis: "y" as const,
                    ...(target.label ? { label: target.label } : {}),
                  },
                ]
              : []),
            ...(guides ?? []),
          ]}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        {items.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={round(left + step * i)}
            y={top}
            width={round(step)}
            height={round(bottom - top)}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {items.map((row, i) => {
          const x = X(i) - columnW / 2;
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
                width={round(columnW)}
                height={round(h)}
                fill={categorical ? cat(i) : accent ? ACCENT : ink(0.3)}
                opacity={categorical ? 0.9 : 1}
              />
              {(values || (!categorical && accent)) && (
                <text
                  x={round(X(i))}
                  y={round(bottom - h - 5)}
                  textAnchor="middle"
                  {...T.value.attrs}
                >
                  {format(row.value)}
                </text>
              )}
              <text
                x={round(X(i))}
                y={axisY}
                textAnchor="middle"
                {...T.axis.attrs}
              >
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
