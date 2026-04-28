"use client";

import { useId } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCompact, type TimelineSeries } from "@/lib/traction";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatTick = (yearMonth: string) => {
  const parts = yearMonth.split("-");
  const idx = Number(parts[1]) - 1;
  return MONTH_NAMES[idx] ?? yearMonth;
};

const formatTooltipLabel = (yearMonth: string) => {
  const [y, m] = yearMonth.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export function DownloadsChart({ timeline }: { timeline: TimelineSeries }) {
  const gradientPrefix = useId();

  if (timeline.data.length < 2 || timeline.series.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-border border-dashed text-muted-foreground text-sm md:h-[360px]">
        Download history is currently unavailable.
      </div>
    );
  }

  const config: ChartConfig = {};
  for (const s of timeline.series) {
    config[s.key] = {
      label: s.label,
      color: `var(--chart-${s.chartIndex})`,
    };
  }

  return (
    <ChartContainer
      config={config}
      className="aspect-auto h-[260px] w-full md:h-[360px]"
    >
      <AreaChart
        data={timeline.data}
        margin={{ left: 8, right: 16, top: 8, bottom: 0 }}
      >
        <defs>
          {timeline.series.map((s) => (
            <linearGradient
              key={s.key}
              id={`${gradientPrefix}-${s.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor={`var(--color-${s.key})`}
                stopOpacity={0.55}
              />
              <stop
                offset="100%"
                stopColor={`var(--color-${s.key})`}
                stopOpacity={0.05}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tickLine={false}
          axisLine={false}
          minTickGap={32}
        />
        <YAxis
          tickFormatter={(v) => formatCompact(v as number)}
          tickLine={false}
          axisLine={false}
          width={42}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)" }}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => {
                const ym = payload?.[0]?.payload?.date as string | undefined;
                return ym ? formatTooltipLabel(ym) : "";
              }}
              formatter={(value, name, item) => {
                const series = timeline.series.find((s) => s.key === name);
                const color =
                  (item as { color?: string } | undefined)?.color ??
                  (item?.payload as { fill?: string } | undefined)?.fill;
                return (
                  <>
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex flex-1 items-center justify-between gap-3 leading-none">
                      <span className="text-muted-foreground">
                        {series?.label ?? String(name)}
                      </span>
                      <span className="font-medium font-mono text-foreground tabular-nums">
                        {formatCompact(value as number)}
                      </span>
                    </div>
                  </>
                );
              }}
              indicator="dot"
            />
          }
        />
        {timeline.series.map((s) => (
          <Area
            key={s.key}
            dataKey={s.key}
            stackId="downloads"
            type="monotone"
            stroke={`var(--color-${s.key})`}
            strokeWidth={1.5}
            fill={`url(#${gradientPrefix}-${s.key})`}
          />
        ))}
        <ChartLegend
          content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />}
        />
      </AreaChart>
    </ChartContainer>
  );
}
