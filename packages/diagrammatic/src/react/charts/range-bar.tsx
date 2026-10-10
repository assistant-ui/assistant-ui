import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import {
  type TickSpec,
  resolveTicks,
  tickValues,
  wantsTicks,
} from "../../core/scale";
import type { Guide } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, rowMarkH, rowMid, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  PAD,
  TickGrid,
  frame,
  resolveWidth,
  typeScale,
} from "../svg";

export type RangeBarProps = BaseProps & {
  items: { label: string; from: number; to: number; at?: number }[];
  xTicks?: TickSpec;
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
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const T = typeScale(fontSize);
    const W = resolveWidth(width);
    const values = [
      ...items.flatMap((row) => [row.from, row.to, row.at ?? row.from]),
      ...tickValues(xTicks),
    ];
    const lo0 = Math.min(...values);
    const lo = Number.isFinite(lo0) ? lo0 : 0;
    const hi0 = Math.max(...values);
    const hi = Number.isFinite(hi0) ? Math.max(hi0, lo + 1) : lo + 1;
    const guideAts = guides?.map((g) => g.at) ?? [];
    const xLo = Math.min(lo, ...guideAts);
    const xHi = Math.max(hi, ...guideAts);
    const xTickList = resolveTicks(xTicks, xLo, xHi, "linear", format);
    const labelW = Math.max(
      0,
      ...items.map((row) => textWidth(row.label, T.label.px)),
    );
    const intervalW = Math.max(
      0,
      ...items.map((row) =>
        textWidth(`${format(row.from)}–${format(row.to)}`, T.axis.px),
      ),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: wantsTicks(xTicks),
      left: Math.min(Math.round(W * 0.4), Math.ceil(PAD + labelW + 6)),
      right: W - PAD - Math.ceil(intervalW) - 6,
    });
    const { left, right, top, bottom, axisY } = F;
    const X = linear(xLo, xHi, left, right);
    const rowH = (bottom - top) / Math.max(1, items.length);
    const Y = (i: number) => top + (i + 0.5) * rowH;
    const barH = rowMarkH(rowH, 0.42);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
        <TickGrid
          ticks={xTickList}
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
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - PAD - 6)}
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
                {...T.axis.attrs}
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
