import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
} from "recharts";

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

type Series = { dataKey: string; color?: string; name?: string };

export function Chart({
  variant = "bar",
  data = [],
  xKey = "label",
  dataKey = "value",
  series,
  color = "var(--chart-1)",
  stacked = false,
  height,
}: {
  variant?: "bar" | "line" | "area" | "sparkline";
  data?: Array<Record<string, string | number>>;
  xKey?: string;
  dataKey?: string;
  series?: Series[];
  color?: string;
  stacked?: boolean;
  height?: number;
}) {
  const h = height ?? (variant === "sparkline" ? 56 : 160);
  const resolved =
    series && series.length > 0
      ? series.map((s, i) => ({
          dataKey: s.dataKey,
          color: s.color ?? PALETTE[i % PALETTE.length] ?? color,
          name: s.name ?? s.dataKey,
        }))
      : [{ dataKey, color, name: dataKey }];
  const stackId = (key: string) => (stacked ? "stack" : key);
  const axis =
    variant !== "sparkline" ? (
      <XAxis
        dataKey={xKey}
        tickLine={false}
        axisLine={false}
        fontSize={11}
        tickMargin={6}
      />
    ) : null;

  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={data} margin={{ top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            {axis}
            {resolved.map((s) => (
              <Bar
                key={s.dataKey}
                dataKey={s.dataKey}
                name={s.name}
                fill={s.color}
                radius={stacked ? 0 : 4}
                stackId={stackId(s.dataKey)}
              />
            ))}
          </BarChart>
        ) : variant === "area" ? (
          <AreaChart data={data} margin={{ top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            {axis}
            {resolved.map((s) => (
              <Area
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                fill={s.color}
                fillOpacity={0.2}
                strokeWidth={2}
                stackId={stackId(s.dataKey)}
              />
            ))}
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, bottom: 4 }}>
            {variant === "line" ? axis : null}
            {resolved.map((s) => (
              <Line
                key={s.dataKey}
                type="monotone"
                dataKey={s.dataKey}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
