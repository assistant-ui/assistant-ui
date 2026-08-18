import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, Item, ScaleKind, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import { positiveExtent, project, round, stroke } from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type ColumnProps = BaseProps & {
  items: Item[];
  highlight?: "max" | "last" | string;
  categorical?: boolean;
  values?: boolean;
  yScale?: ScaleKind;
  yTicks?: readonly Tick[];
  target?: { at: number; label?: string };
  guides?: readonly Guide[];
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
      yScale = "linear",
      yTicks,
      target,
      guides,
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
    const yValues = [
      ...items.map((r) => r.value),
      ...(yTicks?.map((tick) => tick.at) ?? []),
      ...(target ? [target.at] : []),
      ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
        []),
    ];
    const [yLo, yHi] =
      yScale === "log" ? positiveExtent(yValues) : [0, Math.max(...yValues, 1)];
    const Y = project(yScale, yLo, yHi, bottom, top);
    const stepX = (right - left) / Math.max(1, items.length);
    const X = (i: number) => left + (i + 0.5) * stepX;
    const highest = Math.max(...items.map((r) => r.value));
    const step = stepX;
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
