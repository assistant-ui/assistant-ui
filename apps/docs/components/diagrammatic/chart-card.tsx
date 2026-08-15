import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import type { Chart } from "./registry";
import { ChartCanvas } from "./chart-canvas";
import { Reveal } from "./reveal";

/**
 * Charts whose text is the form itself; every other card hides chart text so
 * the wall stays a wall of marks, with labels reserved for the detail page.
 */
const TEXT_CHARTS = new Set([
  "leaderboard",
  "sparkline",
  "sparkbar",
  "win-loss",
  "bullet",
  "progress-ring",
  "gauge",
  "split-bar",
  "kpi-tile",
]);

export function ChartCard({
  chart,
  delay = 0,
}: {
  chart: Chart;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <Link
        href={`/diagrammatic/${chart.slug}`}
        className="group block outline-none"
      >
        <ChartCanvas
          className="h-48 transition-transform duration-300 ease-out group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5"
          chartClassName={cn(
            "max-w-[17rem]",
            !TEXT_CHARTS.has(chart.slug) &&
              "[&_[data-part=legend]]:hidden [&_text]:hidden",
          )}
        >
          <chart.Component />
        </ChartCanvas>
        <div className="mt-3.5 flex items-baseline gap-2">
          <span className={cn(mono, "text-foreground/30 tabular-nums")}>
            {String(chart.index).padStart(2, "0")}
          </span>
          <h3 className="text-[14.5px] font-medium tracking-tight">
            {chart.name}
          </h3>
          <ArrowUpRightIcon className="text-foreground/25 group-hover:text-foreground/70 size-3.5 transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          <span className={cn(mono, "text-foreground/30 ms-auto truncate")}>
            {chart.slug}
          </span>
        </div>
        <p className="text-foreground/50 mt-1 text-[13px] leading-relaxed">
          {chart.blurb}
        </p>
      </Link>
    </Reveal>
  );
}
