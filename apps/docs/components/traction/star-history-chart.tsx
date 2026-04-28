"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompact } from "@/lib/traction";

type Point = { date: string; value: number };

const config = {
  stars: {
    label: "Stars",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const formatTick = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
};

const formatTooltipLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

export function StarHistoryChart({ data }: { data: Point[] }) {
  const gradientId = useId();
  if (data.length < 2) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-border border-dashed text-muted-foreground text-sm md:h-[360px]">
        Star history is currently unavailable.
      </div>
    );
  }

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[260px] w-full md:h-[360px]"
    >
      <AreaChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="var(--color-stars)"
              stopOpacity={0.35}
            />
            <stop
              offset="100%"
              stopColor="var(--color-stars)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
        />
        <YAxis
          dataKey="value"
          tickFormatter={(v) => formatCompact(v as number)}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const iso = payload?.[0]?.payload?.date as string | undefined;
                return iso ? formatTooltipLabel(iso) : "";
              }}
              formatter={(value) => [
                `${formatCompact(value as number)} stars`,
                "",
              ]}
              hideIndicator
            />
          }
        />
        <Area
          dataKey="value"
          type="monotone"
          stroke="var(--color-stars)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
        />
      </AreaChart>
    </ChartContainer>
  );
}
