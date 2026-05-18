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
type ChartPoint = {
  date: string;
  value: number | null;
  forecast: number | null;
};

const config = {
  stars: {
    label: "Stars",
    color: "var(--chart-1)",
  },
  forecast: {
    label: "Projected",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const FORECAST_WINDOW_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function buildChartData(data: Point[]): ChartPoint[] {
  const base: ChartPoint[] = data.map((p) => ({
    date: p.date,
    value: p.value,
    forecast: null,
  }));
  if (data.length < 2) return base;

  const last = data[data.length - 1]!;
  const lastMs = new Date(last.date).getTime();

  const cutoff = lastMs - FORECAST_WINDOW_DAYS * DAY_MS;
  let anchor = data[0]!;
  for (let i = data.length - 1; i >= 0; i--) {
    if (new Date(data[i]!.date).getTime() <= cutoff) {
      anchor = data[i]!;
      break;
    }
  }
  const anchorMs = new Date(anchor.date).getTime();
  if (anchorMs >= lastMs) return base;

  const slope = (last.value - anchor.value) / (lastMs - anchorMs);

  const now = new Date();
  const monthEnd = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth() + 1,
    0,
    23,
    59,
    59,
  );
  if (monthEnd <= lastMs) return base;

  const projected = Math.max(
    last.value,
    Math.round(last.value + slope * (monthEnd - lastMs)),
  );

  // Stamp the last real point with both keys so the dashed forecast line
  // connects continuously to the solid history line.
  base[base.length - 1] = { ...base[base.length - 1]!, forecast: last.value };
  base.push({
    date: new Date(monthEnd).toISOString(),
    value: null,
    forecast: projected,
  });
  return base;
}

export function StarHistoryChart({ data }: { data: Point[] }) {
  const gradientId = useId();
  const chartData = useMemo(() => buildChartData(data), [data]);

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
          dataKey="date"
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
          content={({ active, payload, label }) => {
            // Drop the forecast row at the bridge point so today's tooltip
            // doesn't show the same value twice.
            const filtered = payload?.filter(
              (e) =>
                !(
                  e.dataKey === "forecast" &&
                  (e.payload as { value?: number | null } | undefined)?.value !=
                    null
                ),
            );
            if (!active || !filtered || filtered.length === 0) return null;
            return (
              <ChartTooltipContent
                active={active}
                payload={filtered}
                label={label}
                labelFormatter={(_, p) => {
                  const iso = p?.[0]?.payload?.date as string | undefined;
                  return iso ? formatTooltipLabel(iso) : "";
                }}
                formatter={(value, name) => [
                  `${formatCompact(value as number)} stars${name === "forecast" ? " (projected)" : ""}`,
                  "",
                ]}
                hideIndicator
              />
            );
          }}
        />
        <Area
          dataKey="value"
          type="monotone"
          stroke="var(--color-stars)"
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          connectNulls={false}
          isAnimationActive={false}
        />
        <Area
          dataKey="forecast"
          type="monotone"
          stroke="var(--color-forecast)"
          strokeWidth={2}
          strokeDasharray="4 4"
          fill="transparent"
          connectNulls={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}
