import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, Item, ScaleKind, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import {
  positiveExtent,
  project,
  round,
  rowMarkH,
  rowMid,
  stroke,
} from "../../core/geometry";
import { ACCENT, GRID, cat, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type BarProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
  categorical?: boolean;
  xScale?: ScaleKind;
  xTicks?: readonly Tick[];
  target?: { at: number; label?: string };
  guides?: readonly Guide[];
};

export const Bar = forwardRef<SVGSVGElement, BarProps>(
  (
    {
      items,
      highlight = "max",
      categorical,
      xScale = "linear",
      xTicks,
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
      labels: Boolean(xTicks?.length),
      left: density === "figure" ? 50 : 44,
    });
    const xValues = [
      ...items.map((r) => r.value),
      ...(xTicks?.map((tick) => tick.at) ?? []),
      ...(target ? [target.at] : []),
      ...(guides?.filter((g) => (g.axis ?? "x") === "x").map((g) => g.at) ??
        []),
    ];
    const [xLo, xHi] =
      xScale === "log" ? positiveExtent(xValues) : [0, Math.max(...xValues, 1)];
    const X = project(xScale, xLo, xHi, left, right - 16);
    const highest = Math.max(...items.map((r) => r.value));
    const rowH = (bottom - top) / Math.max(1, items.length);
    const Y = (i: number) => top + (i + 0.5) * rowH;
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
        <Guides
          guides={[
            ...(target
              ? [
                  {
                    at: target.at,
                    axis: "x" as const,
                    ...(target.label ? { label: target.label } : {}),
                  },
                ]
              : []),
            ...(guides ?? []).map((g) => ({
              at: g.at,
              axis: g.axis ?? ("x" as const),
              ...(g.label ? { label: g.label } : {}),
            })),
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
