import type { BaseProps } from "../../core/types";
import { formatCompact } from "../../core/types";
import { extent, stroke } from "../../core/geometry";
import { GRID, NEG, POS, ink } from "../../core/theme";
import { AxisLabels, ChartSvg, TXT, vbHeight } from "../svg";

export type CandlestickProps = BaseProps & {
  data: { open: number; high: number; low: number; close: number }[];
};

export function Candlestick({
  data,
  labels,
  format = formatCompact,
  title,
  aspect,
  className,
}: CandlestickProps) {
  const vh = vbHeight(aspect, 5 / 3);
  const bottom = labels ? vh - 16 : vh - 8;
  const [lo, hi] = extent(data.flatMap((c) => [c.low, c.high]));
  const span = hi - lo || 1;
  const Y = (v: number) => bottom - ((v - lo) / span) * (bottom - 14);
  const step = 168 / Math.max(1, data.length);
  const xs = data.map((_, i) => 30 + step * (i + 0.5));
  const body = Math.min(9, step * 0.45);
  return (
    <ChartSvg vh={vh} title={title} className={className}>
      {[lo, hi].map((v) => (
        <g key={v}>
          <line
            x1="26"
            y1={Y(v)}
            x2="192"
            y2={Y(v)}
            stroke={GRID}
            data-part="grid"
            {...stroke.hair}
          />
          <text x="23" y={Y(v) + 1.6} textAnchor="end" {...TXT.axis}>
            {format(v)}
          </text>
        </g>
      ))}
      {data.map((candle, i) => {
        const x = xs[i]!;
        const up = candle.close >= candle.open;
        const top = Y(Math.max(candle.open, candle.close));
        const height = Math.abs(Y(candle.open) - Y(candle.close));
        return (
          <g key={i} data-part="mark" data-i={i}>
            <line
              x1={x}
              y1={Y(candle.high)}
              x2={x}
              y2={Y(candle.low)}
              stroke={ink(0.35)}
              {...stroke.hair}
            />
            <rect
              x={x - body / 2}
              y={top}
              width={body}
              height={Math.max(height, 1.5)}
              rx="1.5"
              fill={up ? POS : NEG}
            />
          </g>
        );
      })}
      {labels && <AxisLabels labels={labels} xs={xs} y={vh - 4} />}
    </ChartSvg>
  );
}
