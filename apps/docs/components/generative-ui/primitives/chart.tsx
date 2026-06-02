import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
} from "recharts";

export function Chart({
  variant = "bar",
  data = [],
  xKey = "label",
  dataKey = "value",
  color = "var(--chart-1)",
  height,
}: {
  variant?: "bar" | "line" | "sparkline";
  data?: Array<Record<string, string | number>>;
  xKey?: string;
  dataKey?: string;
  color?: string;
  height?: number;
}) {
  const h = height ?? (variant === "sparkline" ? 56 : 160);
  return (
    <div style={{ width: "100%", height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={data} margin={{ top: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey={xKey}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickMargin={6}
            />
            <Bar dataKey={dataKey} fill={color} radius={4} />
          </BarChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, bottom: 4 }}>
            {variant === "line" && (
              <XAxis
                dataKey={xKey}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickMargin={6}
              />
            )}
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
