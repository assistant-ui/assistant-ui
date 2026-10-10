import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { textWidth, truncate } from "../../core/text";
import {
  type TickSpec,
  resolveTicks,
  tickValues,
  wantsTicks,
} from "../../core/scale";
import type { Guide, Item, ScaleKind } from "../../core/types";
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
  PAD,
  TickGrid,
  frame,
  resolveWidth,
  typeScale,
} from "../svg";

export type BarProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
  categorical?: boolean;
  xScale?: ScaleKind;
  xTicks?: TickSpec;
  target?: { at: number; label?: string };
  guides?: readonly Guide[];
};

/** The share of the width row labels may take before they are cut. */
const LABEL_SHARE = 0.4;

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
    const labelW = Math.max(
      0,
      ...items.map((r) => textWidth(r.label, T.label.px)),
    );
    const valueW = Math.max(
      0,
      ...items.map((r) => textWidth(format(r.value), T.axis.px)),
    );
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: wantsTicks(xTicks),
      left: Math.min(Math.round(W * LABEL_SHARE), Math.ceil(PAD + labelW + 6)),
      right: W - PAD - Math.ceil(valueW) - 6,
    });
    const { left, right, top, bottom, axisY } = F;
    const xValues = [
      ...items.map((r) => r.value),
      ...tickValues(xTicks),
      ...(target ? [target.at] : []),
      ...(guides?.filter((g) => (g.axis ?? "x") === "x").map((g) => g.at) ??
        []),
    ];
    const [xLo, xHi] =
      xScale === "log" ? positiveExtent(xValues) : [0, Math.max(...xValues, 1)];
    const X = project(xScale, xLo, xHi, left, right);
    const xTickList = resolveTicks(xTicks, xLo, xHi, xScale, format);
    const highest = Math.max(...items.map((r) => r.value));
    const rowH = (bottom - top) / Math.max(1, items.length);
    const Y = (i: number) => top + (i + 0.5) * rowH;
    const barH = rowMarkH(rowH, 0.55);
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
          y1={top}
          x2={left}
          y2={bottom}
          stroke={GRID}
          data-part="grid"
          {...stroke.hair}
        />
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
            width={round(F.width - PAD - left)}
            height={round(rowH)}
            fill="transparent"
            data-part="mark"
            data-i={i}
          />
        ))}
        {items.map((row, i) => {
          const mid = round(rowMid(i, rowH, top));
          const w = Math.max(X(row.value) - left, 2);
          const accent =
            highlight === "max"
              ? row.value === highest
              : row.label === highlight;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <text
                x={left - 6}
                y={mid}
                textAnchor="end"
                dominantBaseline="central"
                {...T.label.attrs}
              >
                {truncate(row.label, T.label.px, left - 6 - PAD)}
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
                x={round(left + w + 6)}
                y={mid}
                dominantBaseline="central"
                {...T.axis.attrs}
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
