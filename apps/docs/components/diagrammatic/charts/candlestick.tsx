import { NEG, POS, TXT, VIEWBOX, stroke } from "./lib";

const DAYS = ["M", "T", "W", "T", "F", "M", "T", "W", "T", "F"];
const CANDLES = [
  { open: 38, close: 52, low: 32, high: 56 },
  { open: 52, close: 46, low: 42, high: 58 },
  { open: 46, close: 60, low: 44, high: 64 },
  { open: 60, close: 72, low: 56, high: 76 },
  { open: 72, close: 64, low: 60, high: 78 },
  { open: 64, close: 58, low: 52, high: 68 },
  { open: 58, close: 70, low: 54, high: 74 },
  { open: 70, close: 82, low: 66, high: 88 },
  { open: 82, close: 76, low: 70, high: 86 },
  { open: 76, close: 90, low: 72, high: 96 },
];

const Y = (v: number) => 104 - v * 0.92;

export function CandlestickChart() {
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {[40, 90].map((v) => (
        <g key={v}>
          <line
            x1="26"
            y1={Y(v)}
            x2="192"
            y2={Y(v)}
            className="stroke-foreground/8"
            {...stroke.hair}
          />
          <text x="22" y={Y(v) + 1.6} textAnchor="end" {...TXT.axis}>
            {v + 100}
          </text>
        </g>
      ))}
      {CANDLES.map((candle, i) => {
        const x = 34 + i * 17.2;
        const up = candle.close >= candle.open;
        const top = Y(Math.max(candle.open, candle.close));
        const height = Math.abs(candle.close - candle.open) * 0.92;
        return (
          <g key={i}>
            <line
              x1={x}
              y1={Y(candle.high)}
              x2={x}
              y2={Y(candle.low)}
              className="stroke-foreground/35"
              {...stroke.hair}
            />
            <rect
              x={x - 3.5}
              y={top}
              width="7"
              height={Math.max(height, 2)}
              rx="1.5"
              fill={up ? POS : NEG}
            />
            <text x={x} y="114" textAnchor="middle" {...TXT.axis}>
              {DAYS[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
