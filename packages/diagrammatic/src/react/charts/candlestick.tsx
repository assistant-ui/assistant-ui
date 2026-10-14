import type { BaseProps } from "../svg";
import { forwardRef } from "react";
import {
  type TickSpec,
  boundsOf,
  resolveTicks,
  wantsTicks,
} from "../../core/scale";
import type { Guide } from "../../core/types";
import { formatCompact } from "../../core/types";
import { linear, round, stroke } from "../../core/geometry";
import { GRID, NEG, POS, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, Guides, TickGrid, frame } from "../svg";

export type CandlestickProps = BaseProps & {
  data: { open: number; high: number; low: number; close: number }[];
  yTicks?: TickSpec;
  guides?: readonly Guide[];
};

export const Candlestick = forwardRef<SVGSVGElement, CandlestickProps>(
  (
    {
      data,
      yTicks,
      guides,
      labels,
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
    const [lo, hi] = boundsOf(
      data.flatMap((c) => [c.low, c.high]),
      yTicks,
      guides,
    );
    const yTickList = resolveTicks(yTicks, lo, hi, "linear", format);
    const F = frame({ width, height, aspect, fontSize }, 5 / 3, {
      labels: Boolean(labels),
      ticks: yTickList ?? true,
    });
    const { left, right, top, bottom, axisY, T } = F;
    const Y = linear(lo, hi, bottom, top);
    const step = (right - left) / Math.max(1, data.length);
    const xs = data.map((_, i) => left + step * (i + 0.5));
    const X = (i: number) => left + step * (i + 0.5);
    const body = Math.min(16, step * 0.45);
    return (
      <ChartSvg
        ref={ref}
        {...rest}
        frame={F}
        title={title}
        className={className}
      >
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
        {!wantsTicks(yTicks) &&
          [lo, hi].map((v) => (
            <g key={v}>
              <line
                x1={left}
                y1={round(Y(v))}
                x2={right}
                y2={round(Y(v))}
                stroke={GRID}
                data-part="grid"
                {...stroke.hair}
              />
              <text
                x={left - 6}
                y={round(Y(v))}
                textAnchor="end"
                dominantBaseline="central"
                {...T.axis.attrs}
              >
                {format(v)}
              </text>
            </g>
          ))}
        {data.map((candle, i) => {
          const x = xs[i]!;
          const up = candle.close >= candle.open;
          const bodyTop = Y(Math.max(candle.open, candle.close));
          const bodyH = Math.abs(Y(candle.open) - Y(candle.close));
          return (
            <g key={i} data-part="mark" data-i={i}>
              <line
                x1={round(x)}
                y1={round(Y(candle.high))}
                x2={round(x)}
                y2={round(Y(candle.low))}
                stroke={ink(0.35)}
                {...stroke.hair}
              />
              <rect
                x={round(x - body / 2)}
                y={round(bodyTop)}
                width={round(body)}
                height={round(Math.max(bodyH, 2))}
                fill={up ? POS : NEG}
              />
            </g>
          );
        })}
        {labels && (
          <AxisLabels labels={labels} xs={xs} y={axisY} type={T.axis} />
        )}
      </ChartSvg>
    );
  },
);

Candlestick.displayName = "Candlestick";
