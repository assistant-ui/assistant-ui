import {
  NEG,
  POS,
  TXT,
  VIEWBOX,
  bandPath,
  linePath,
  scale,
  stroke,
} from "./lib";

const ACTUAL = [30, 44, 56, 48, 40, 34, 46, 62, 74, 84];
const FORECAST = [40, 42, 44, 46, 48, 50, 52, 54, 56, 58];
const MONTHS = ["Jan", "Apr", "Jul", "Oct"];

export function DifferenceAreaChart() {
  const actual = scale(ACTUAL, 14, 186, 100, 18, 0, 100);
  const forecast = scale(FORECAST, 14, 186, 100, 18, 0, 100);
  const above = actual.map((p, i) => ({
    x: p.x,
    y: Math.min(p.y, forecast[i]!.y),
  }));
  const below = actual.map((p, i) => ({
    x: p.x,
    y: Math.max(p.y, forecast[i]!.y),
  }));
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      <path d={bandPath(above, forecast)} fill={POS} opacity="0.22" />
      <path d={bandPath(forecast, below)} fill={NEG} opacity="0.22" />
      <path
        d={linePath(forecast)}
        fill="none"
        className="stroke-foreground/40"
        strokeDasharray="4 4"
        {...stroke.hair}
      />
      <path
        d={linePath(actual)}
        fill="none"
        className="stroke-foreground/75"
        {...stroke.line}
      />
      <line
        x1="14"
        y1="9.4"
        x2="24"
        y2="9.4"
        className="stroke-foreground/75"
        {...stroke.line}
      />
      <text x="27" y="11" {...TXT.axis}>
        actual
      </text>
      <line
        x1="54"
        y1="9.4"
        x2="64"
        y2="9.4"
        className="stroke-foreground/40"
        strokeDasharray="3 3"
        {...stroke.hair}
      />
      <text x="67" y="11" {...TXT.axis}>
        forecast
      </text>
      <rect
        x="102"
        y="7"
        width="6"
        height="4.5"
        rx="1"
        fill={POS}
        opacity="0.35"
      />
      <text x="111" y="11" {...TXT.axis}>
        ahead
      </text>
      <rect
        x="138"
        y="7"
        width="6"
        height="4.5"
        rx="1"
        fill={NEG}
        opacity="0.35"
      />
      <text x="147" y="11" {...TXT.axis}>
        behind
      </text>
      {MONTHS.map((m, i) => (
        <text
          key={m}
          x={14 + i * 57.3}
          y="112"
          textAnchor="middle"
          {...TXT.axis}
        >
          {m}
        </text>
      ))}
    </svg>
  );
}
