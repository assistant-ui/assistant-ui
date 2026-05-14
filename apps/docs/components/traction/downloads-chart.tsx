"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  type ChartConfig,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/lib/format";
import type { TimelineSeries } from "@/lib/traction";

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
  const [hidden, setHidden] = useState<Set<string>>(new Set());

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

  const toggle = (key: string) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
                stopOpacity={0.18}
              />
              <stop
                offset="100%"
                stopColor={`var(--color-${s.key})`}
                stopOpacity={0}
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
          content={(tooltipProps) => {
            // hide _proj entries when their raw counterpart has a value (avoids dup rows on the bridging month).
            const filtered = tooltipProps.payload
              ?.filter((entry) => {
                const key = String(entry?.dataKey ?? "");
                if (!key.endsWith("_proj")) return true;
                const baseKey = key.slice(0, -5);
                const rowPayload = entry.payload as
                  | Record<string, number | undefined>
                  | undefined;
                return rowPayload?.[baseKey] === undefined;
              })
              .slice()
              .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));
            return (
              <ChartTooltipContent
                {...(tooltipProps as Record<string, unknown>)}
                payload={filtered}
                labelFormatter={(_, p) => {
                  const ym = p?.[0]?.payload?.date as string | undefined;
                  return ym ? formatTooltipLabel(ym) : "";
                }}
                formatter={(value, name, item) => {
                  const rawName = String(name);
                  const baseKey = rawName.endsWith("_proj")
                    ? rawName.slice(0, -5)
                    : rawName;
                  const series = timeline.series.find((s) => s.key === baseKey);
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
                          {series?.label ?? rawName}
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
            );
          }}
        />
        {timeline.series.map((s) => {
          const isHidden = hidden.has(s.key);
          return (
            <Area
              key={s.key}
              dataKey={s.key}
              type="monotone"
              stroke={isHidden ? "transparent" : `var(--color-${s.key})`}
              strokeWidth={1.75}
              fill={
                isHidden ? "transparent" : `url(#${gradientPrefix}-${s.key})`
              }
              isAnimationActive={false}
            />
          );
        })}
        {timeline.projectedMonth ? (
          <>
            <ReferenceLine
              x={timeline.projectedMonth}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              strokeOpacity={0.4}
            />
            {timeline.series.map((s) => {
              const isHidden = hidden.has(s.key);
              return (
                <Line
                  key={`${s.key}-proj`}
                  dataKey={`${s.key}_proj`}
                  stroke={isHidden ? "transparent" : `var(--color-${s.key})`}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  type="monotone"
                  dot={false}
                  activeDot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                  legendType="none"
                />
              );
            })}
          </>
        ) : null}
        <ChartLegend
          content={({ payload }) => (
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3">
              {(
                payload as
                  | Array<{
                      dataKey?: string | number;
                      value?: string;
                      color?: string;
                    }>
                  | undefined
              )?.map((item) => {
                const key = String(item.dataKey ?? item.value ?? "");
                const series = timeline.series.find((s) => s.key === key);
                if (!series) return null;
                const isHidden = hidden.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggle(key)}
                    className={cn(
                      "flex cursor-pointer items-center gap-1.5 rounded-sm text-muted-foreground text-xs outline-none transition-opacity hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                      isHidden && "opacity-40",
                    )}
                  >
                    <div
                      className="h-2 w-2 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: `var(--color-${key})` }}
                    />
                    <span>{series.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        />
      </AreaChart>
    </ChartContainer>
  );
}
