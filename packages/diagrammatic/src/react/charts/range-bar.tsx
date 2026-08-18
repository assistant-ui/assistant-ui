import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, rowMarkH, rowMid, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type RangeBarProps = BaseProps & {
  items: { label: string; from: number; to: number; at?: number }[];
  xTicks?: readonly Tick[];
  guides?: readonly Guide[];
};

export const RangeBar = forwardRef<SVGSVGElement, RangeBarProps>(
  (
    {
      items,
      xTicks,
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
    const lo = Math.min(
      ...items.flatMap((row) => [row.from, row.at ?? row.from]),
      ...(xTicks?.map((tick) => tick.at) ?? []),
    );
    const hi = Math.max(
      ...items.flatMap((row) => [row.to, row.at ?? row.to]),
      ...(xTicks?.map((tick) => tick.at) ?? []),
      lo + 1,
    );
    const guideAts = guides?.map((g) => g.at) ?? [];
    const xLo = Math.min(lo, ...guideAts);
    const xHi = Math.max(hi, ...guideAts);
    const X = linear(xLo, xHi, left, right - 28);
    const rowH = (bottom - top) / Math.max(1, items.length);
    const Y = (i: number) => top + (i + 0.5) * rowH;
    const barH = rowMarkH(rowH, 0.42);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        vh={vh}
        title={title}
        density={density}
        className={className}
      >
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
          guides={(guides ?? []).map((g) => ({
            at: g.at,
            axis: g.axis ?? ("x" as const),
            ...(g.label ? { label: g.label } : {}),
          }))}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        {items.map((row, i) => {
          const mid = rowMid(i, rowH, top);
          const x0 = X(row.from);
          const x1 = X(row.to);
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
              <line
                x1={left}
                y1={mid}
                x2={right}
                y2={mid}
                stroke={GRID}
                {...stroke.hair}
              />
              <rect
                x={round(Math.min(x0, x1))}
                y={round(mid - barH / 2)}
                width={round(Math.max(Math.abs(x1 - x0), 2))}
                height={round(barH)}
                fill={ink(0.28)}
              />
              {row.at !== undefined && (
                <line
                  x1={round(X(row.at))}
                  y1={round(mid - barH * 0.85)}
                  x2={round(X(row.at))}
                  y2={round(mid + barH * 0.85)}
                  stroke={ACCENT}
                  data-part="mark"
                  {...stroke.line}
                />
              )}
              <text
                x={round(Math.max(x0, x1) + 4)}
                y={mid}
                dominantBaseline="central"
                {...T.axis}
              >
                {format(row.from)}–{format(row.to)}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

RangeBar.displayName = "RangeBar";
