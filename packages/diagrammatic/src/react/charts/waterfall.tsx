import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import { type TickSpec, resolveTicks, upperBound } from "../../core/scale";
import type { Guide } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { truncate } from "../../core/text";
import { GRID, NEG, POS, ink } from "../../core/theme";
import { ChartSvg, Guides, TickGrid, frame } from "../svg";

export type WaterfallProps = BaseProps & {
  steps: { label: string; value: number; total?: boolean }[];
  yTicks?: TickSpec;
  guides?: readonly Guide[];
};

export const Waterfall = forwardRef<SVGSVGElement, WaterfallProps>(
  (
    {
      steps,
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
    let running = 0;
    const resolved = steps.map((step) => {
      const from = step.total ? 0 : running;
      const to = step.total ? step.value : running + step.value;
      running = to;
      return { ...step, from, to };
    });
    const max = upperBound(
      resolved.flatMap((s) => [s.from, s.to]),
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
    const step = (right - left) / Math.max(1, steps.length);
    const X = (i: number) => left + step * (i + 0.5);
    const columnW = Math.min(48, step * 0.6);
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
        {resolved.map((entry, i) => {
          const x = left + step * (i + 0.5) - columnW / 2;
          const barTop = Y(Math.max(entry.from, entry.to));
          const h = Math.abs(Y(entry.from) - Y(entry.to));
          const next = resolved[i + 1];
          return (
            <g key={entry.label} data-part="mark" data-i={i}>
              <rect
                x={round(x)}
                y={round(barTop)}
                width={round(columnW)}
                height={round(Math.max(h, 1.5))}
                fill={entry.total ? ink(0.55) : entry.value >= 0 ? POS : NEG}
                opacity={entry.total ? 1 : 0.85}
              />
              {!entry.total && (
                <text
                  x={round(x + columnW / 2)}
                  y={round(barTop - 3)}
                  textAnchor="middle"
                  {...T.axis.attrs}
                >
                  {entry.value > 0
                    ? `+${format(entry.value)}`
                    : format(entry.value)}
                </text>
              )}
              {next && (
                <line
                  x1={round(x + columnW)}
                  y1={round(Y(entry.to))}
                  x2={round(x + step)}
                  y2={round(Y(entry.to))}
                  stroke={ink(0.3)}
                  {...stroke.hair}
                  strokeDasharray="1.5 2"
                  data-part="grid"
                />
              )}
              <text
                x={round(x + columnW / 2)}
                y={axisY}
                textAnchor="middle"
                {...T.axis.attrs}
              >
                {truncate(entry.label, T.axis.px, Math.max(0, step - 4))}
              </text>
            </g>
          );
        })}
      </ChartSvg>
    );
  },
);

Waterfall.displayName = "Waterfall";
