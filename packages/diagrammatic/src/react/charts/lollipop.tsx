import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import type { Guide, Item, Tick } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import {
  ChartSvg,
  Guides,
  TickGrid,
  plotFrame,
  typeScale,
  vbHeight,
} from "../svg";

export type LollipopProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
  yTicks?: readonly Tick[];
  guides?: readonly Guide[];
};

export const Lollipop = forwardRef<SVGSVGElement, LollipopProps>(
  (
    {
      items,
      highlight = "max",
      yTicks,
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
      ...(guides?.map((g) => g.at) ?? []),
    ];
    const max = Math.max(...yValues, 1);
    const Y = linear(0, max, bottom, top);
    const X = (i: number) =>
      left + ((right - left) / Math.max(1, items.length)) * (i + 0.5);
    const highest = Math.max(...items.map((r) => r.value));
    const step = (right - left) / Math.max(1, items.length);
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
          guides={guides}
          X={X}
          Y={Y}
          left={left}
          right={right}
          top={top}
          bottom={bottom}
          type={T.axis}
        />
        {items.map((row, i) => {
          const x = left + step * (i + 0.5);
          const y = Y(row.value);
          const accent =
            highlight === "max"
              ? row.value === highest
              : row.label === highlight;
          return (
            <g key={row.label} data-part="mark" data-i={i}>
              <line
                x1={x}
                y1={bottom}
                x2={x}
                y2={y + 4}
                stroke={ink(0.3)}
                {...stroke.medium}
              />
              <circle
                cx={x}
                cy={y}
                r="4.5"
                fill={accent ? ACCENT : ink(0.55)}
              />
              {accent && (
                <text x={x} y={y - 7} textAnchor="middle" {...T.value}>
                  {format(row.value)}
                </text>
              )}
              <text x={x} y={axisY} textAnchor="middle" {...T.axis}>
                {row.label}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Lollipop.displayName = "Lollipop";
