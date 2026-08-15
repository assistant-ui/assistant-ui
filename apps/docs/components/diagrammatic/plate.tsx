import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Chart } from "./registry";
import { meta, mono } from "./atlas";
import { Reveal } from "./reveal";

/**
 * Charts whose text is the form itself; every other plate hides chart text so
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

export function Plate({ chart, delay = 0 }: { chart: Chart; delay?: number }) {
  return (
    <Reveal
      className="h-full border-r border-b border-(--da-line) bg-(--da-plate)"
      delay={delay}
    >
      <Link
        href={`/diagrammatic/${chart.slug}`}
        className="group flex h-full flex-col px-5 pt-4 pb-5 transition-colors outline-none hover:bg-[color-mix(in_oklab,var(--da-plate)_92%,var(--da-line))] focus-visible:bg-[color-mix(in_oklab,var(--da-plate)_92%,var(--da-line))]"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span
            className={cn(
              meta,
              "text-[12px] text-(--da-ink)/40 tabular-nums transition-colors group-hover:text-(--da-red)",
            )}
          >
            {String(chart.index).padStart(2, "0")}
          </span>
          <span className={cn(mono, "truncate text-(--da-ink)/25")}>
            {chart.slug}
          </span>
        </div>
        <div
          className={cn(
            "my-auto flex min-h-40 items-center justify-center py-5",
            !TEXT_CHARTS.has(chart.slug) &&
              "[&_[data-part=legend]]:hidden [&_text]:hidden",
          )}
        >
          <div className="w-full max-w-[16.5rem]">
            {chart.examples[0]?.chart}
          </div>
        </div>
        <h3 className="text-[14px] font-medium tracking-tight">{chart.name}</h3>
        <p className="mt-1 hidden text-[12.5px] leading-snug text-(--da-ink)/45 sm:block">
          {chart.blurb}
        </p>
      </Link>
    </Reveal>
  );
}
