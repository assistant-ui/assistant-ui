import {
  CAT,
  Legend,
  TXT,
  VIEWBOX,
  bandPath,
  linePath,
  scale,
  stroke,
} from "./lib";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
const CHANNELS = [
  { name: "search", data: [16, 20, 18, 24, 26, 24, 30, 34] },
  { name: "direct", data: [10, 12, 16, 14, 18, 22, 20, 24] },
  { name: "social", data: [8, 8, 10, 12, 10, 14, 16, 14] },
];

export function StackedAreaChart() {
  const totals = MONTHS.map((_, i) =>
    CHANNELS.reduce((sum, s) => sum + s.data[i]!, 0),
  );
  const max = Math.max(...totals);
  const cumulative = CHANNELS.map((_, k) =>
    MONTHS.map((_, i) =>
      CHANNELS.slice(0, k + 1).reduce((sum, s) => sum + s.data[i]!, 0),
    ),
  );
  const layer = (values: number[]) => scale(values, 14, 186, 100, 22, 0, max);
  const base = layer(MONTHS.map(() => 0));
  const tops = cumulative.map(layer);
  return (
    <svg viewBox={VIEWBOX} className="block h-auto w-full">
      {tops.map((top, k) => (
        <path
          key={k}
          d={bandPath(top, k === 0 ? base : tops[k - 1]!)}
          fill={CAT[k]}
          opacity="0.8"
        />
      ))}
      {tops.slice(0, -1).map((top, k) => (
        <path
          key={k}
          d={linePath(top)}
          fill="none"
          className="stroke-background dark:stroke-popover"
          {...stroke.medium}
        />
      ))}
      <Legend
        x={14}
        y={12}
        items={CHANNELS.map((s, k) => ({ label: s.name, fill: CAT[k] }))}
      />
      {MONTHS.map((m, i) => (
        <text key={m} x={base[i]!.x} y="112" textAnchor="middle" {...TXT.axis}>
          {m}
        </text>
      ))}
    </svg>
  );
}
