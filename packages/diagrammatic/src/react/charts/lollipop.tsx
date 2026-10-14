import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { type TickSpec, resolveTicks, upperBound } from "../../core/scale";
import type { Guide, Item } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, stroke } from "../../core/geometry";
import { ACCENT, GRID, ink } from "../../core/theme";
import { ChartSvg, Guides, TickGrid, frame } from "../svg";

export type LollipopProps = BaseProps & {
  items: Item[];
  highlight?: "max" | string;
  yTicks?: TickSpec;
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
      width,
      height,
      aspect,
      fontSize,
      className,
      ...rest
    },
    ref,
  ) => {
    const max = upperBound(
      items.map((r) => r.value),
      yTicks,
      guides,
    );
    const yTickList = resolveTicks(yTicks, 0, max, "linear", format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: true,
      ticks: yTickList ?? false,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = linear(0, max, bottom, top);
    const X = (i: number) =>
      left + ((right - left) / Math.max(1, items.length)) * (i + 0.5);
    const highest = Math.max(...items.map((r) => r.value));
    const step = (right - left) / Math.max(1, items.length);
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
                y2={y + 3}
                stroke={ink(0.3)}
                {...stroke.medium}
              />
              <circle cx={x} cy={y} r={3} fill={accent ? ACCENT : ink(0.55)} />
              {accent && (
                <text x={x} y={y - 7} textAnchor="middle" {...T.value.attrs}>
                  {format(row.value)}
                </text>
              )}
              <text x={x} y={axisY} textAnchor="middle" {...T.axis.attrs}>
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
