"use client";

import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompact } from "@/lib/format";

type Point = { date: string; value: number };

const config = {
  stars: {
    label: "Stars",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const formatTick = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });

const formatTooltipLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export function StarHistoryChart({ data }: { data: Point[] }) {
  const gradientId = useId();
  const chartData = useMemo(
    () =>
      data.map((p) => ({
        date: p.date,
        ts: new Date(p.date).getTime(),
        stars: p.value,
      })),
    [data],
  );

  if (data.length < 2) {
    return (
      <div className="text-muted-foreground flex h-[260px] items-center text-sm md:h-[360px]">
        Star history is currently unavailable.
      </div>
    );
  }

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[260px] w-full md:h-[360px]"
    >
      <AreaChart
        data={chartData}
        margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
      >
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
          dataKey="ts"
          type="number"
          scale="time"
          domain={["dataMin", "dataMax"]}
          tickFormatter={formatTick}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
        />
        <YAxis
          tickFormatter={(v) => formatCompact(v as number)}
          tickLine={false}
          axisLine={false}
          width={36}
          // 'auto' overshoots (10.5k → 12k); pad 5% and round up to 500 instead.
          domain={[0, (max: number) => Math.ceil((max * 1.05) / 500) * 500]}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, p) => {
                const iso = p?.[0]?.payload?.date as string | undefined;
                return iso ? formatTooltipLabel(iso) : "";
              }}
              formatter={(value) => `${formatCompact(value as number)} stars`}
            />
          }
        />
        <Area
          dataKey="stars"
          type="monotone"
          stroke="var(--color-stars)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
