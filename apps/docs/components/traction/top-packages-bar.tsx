"use client";

import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompact, formatNumber } from "@/lib/traction";

type Row = { name: string; weekly: number };

const config = {
  weekly: {
    label: "Weekly downloads",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const shortenName = (name: string) =>
  name.replace("@assistant-ui/", "").replace(/^assistant-/, "");

export function TopPackagesBar({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return null;
  }

  const data = rows.map((r) => ({
    name: r.name,
    short: shortenName(r.name),
    weekly: r.weekly,
  }));

  const height = Math.max(220, data.length * 32 + 40);

  return (
    <ChartContainer
      config={config}
      className="aspect-auto w-full"
      style={{ height }}
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v) => formatCompact(v as number)}
          tickLine={false}
          axisLine={false}
          fontSize={10}
        />
        <YAxis
          dataKey="short"
          type="category"
          tickLine={false}
          axisLine={false}
          width={110}
          fontSize={10}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const full = payload?.[0]?.payload?.name as string | undefined;
                return full ?? "";
              }}
              formatter={(value) => [
                `${formatNumber(value as number)} / week`,
                "",
              ]}
              hideIndicator
            />
          }
        />
        <Bar dataKey="weekly" radius={[0, 4, 4, 0]}>
          {data.map((row, i) => (
            <Cell
              key={row.name}
              fill="var(--color-weekly)"
              fillOpacity={1 - i * 0.05}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
