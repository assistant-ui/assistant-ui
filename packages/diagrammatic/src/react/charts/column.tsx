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
import {
  linearFit,
  positiveExtent,
  project,
  round,
  stroke,
} from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import { ChartSvg, Guides, TickGrid, frame } from "../svg";

export type ColumnProps = BaseProps & {
  items: Item[];
  trend?: boolean;
  mark?: "bar" | "dot";
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

/** The narrowest column, in pixels, still drawn as dots; thinner columns fall back to bars. */
const MIN_DOT_COLUMN = 4;

/**
 * `categorical` colors each item as its own entity from the token palette;
 * `values` prints every value, not only the highlighted one.
 */
export const Column = forwardRef<SVGSVGElement, ColumnProps>(
  (
    {
      items,
      trend,
      mark = "bar",
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
    const fit =
      trend && yScale !== "log" && items.length > 1
        ? linearFit(items.map((row, i) => ({ x: i, y: row.value })))
        : undefined;
    const yValues = [
      ...items.map((r) => r.value),
      ...(fit ? [fit(0), fit(items.length - 1)] : []),
      ...tickValues(yTicks),
      ...(target ? [target.at] : []),
      ...(guides?.filter((g) => (g.axis ?? "y") === "y").map((g) => g.at) ??
        []),
    ];
    const [yLo, yHi] =
      yScale === "log"
        ? positiveExtent(yValues)
        : [Math.min(0, ...yValues), Math.max(...yValues, 1)];
    const yTickList = resolveTicks(yTicks, yLo, yHi, yScale, format);
    const highest = Math.max(...items.map((r) => r.value));
    const isAccent = (row: Item, i: number) =>
      highlight === "last"
        ? i === items.length - 1
        : highlight === "max"
          ? row.value === highest
          : row.label === highlight;
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      ticks: wantsTicks(yTicks) ? (yTickList ?? true) : false,
      bottomValueLabel:
        yScale !== "log" &&
        items.some(
          (row, i) =>
            row.value < 0 && (values || (!categorical && isAccent(row, i))),
        ),
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = project(yScale, yLo, yHi, bottom, top);
    const zeroY = yScale === "log" ? bottom : Y(0);
    const step = (right - left) / Math.max(1, items.length);
    const X = (i: number) => left + (i + 0.5) * step;
    const columnW = Math.min(MAX_COLUMN, step * 0.62);
    const pitch = Math.min(columnW, Math.max(6, (bottom - top) / 24));
    const dots = mark === "dot" && columnW >= MIN_DOT_COLUMN;
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
          y1={zeroY}
          x2={right}
          y2={zeroY}
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
        {fit && (
          <line
            x1={round(X(0))}
            y1={round(Y(fit(0)))}
            x2={round(X(items.length - 1))}
            y2={round(Y(fit(items.length - 1)))}
            stroke={ACCENT}
            strokeDasharray="3 4"
            opacity="0.7"
            data-part="trend"
            {...stroke.hair}
          />
        )}
        {items.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={round(left + step * i)}
            y={top}
            width={round(step)}
            height={round(bottom - top)}
            fill="transparent"
            data-dg-hit-target=""
            data-part="mark"
            data-i={i}
          />
        ))}
        {items.map((row, i) => {
          const x = X(i) - columnW / 2;
          const valueY = Y(row.value);
          const h = Math.abs(zeroY - valueY);
          const accent = isAccent(row, i);
          const fill = categorical ? cat(i) : accent ? ACCENT : ink(0.3);
          const opacity = categorical ? 0.9 : 1;
          const direction = row.value < 0 ? 1 : -1;
          const trackCount = Math.floor(
            (row.value < 0 ? bottom - zeroY : zeroY - top) / pitch,
          );
          const dotCount =
            row.value === 0 || (yScale === "log" && row.value < 0)
              ? 0
              : Math.min(
                  Math.max(1, Math.round(h / pitch)),
                  Math.max(1, trackCount),
                );
          const dotY = (dot: number) => zeroY + direction * (dot + 0.5) * pitch;
          const labelY = dots ? zeroY + direction * dotCount * pitch : valueY;
          return (
            <g key={`${row.label}-${i}`} data-part="mark" data-i={i}>
              {dots ? (
                <>
                  {Array.from(
                    { length: Math.max(0, trackCount - dotCount) },
                    (_, dot) => (
                      <circle
                        key={`track-${dot}`}
                        cx={round(X(i))}
                        cy={round(dotY(dotCount + dot))}
                        r={round(pitch * 0.38)}
                        fill={ink(0.08)}
                      />
                    ),
                  )}
                  {Array.from({ length: dotCount }, (_, dot) => (
                    <circle
                      key={dot}
                      cx={round(X(i))}
                      cy={round(dotY(dot))}
                      r={round(pitch * 0.38)}
                      fill={fill}
                      opacity={opacity}
                    />
                  ))}
                </>
              ) : (
                <rect
                  x={round(x)}
                  y={round(Math.min(zeroY, valueY))}
                  width={round(columnW)}
                  height={round(h)}
                  fill={fill}
                  opacity={opacity}
                />
              )}
              {(values || (!categorical && accent)) && (
                <text
                  x={round(X(i))}
                  y={round(row.value < 0 ? labelY + 5 : labelY - 5)}
                  textAnchor="middle"
                  dominantBaseline={row.value < 0 ? "hanging" : undefined}
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
