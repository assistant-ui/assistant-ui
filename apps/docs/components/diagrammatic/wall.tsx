import Link from "next/link";
import { cn } from "@/lib/utils";
import { plateSurface } from "./figure";
import { CHART_SECTIONS, sectionId, type Chart } from "./registry";

const TEXT_CHARTS = new Set([
  "leaderboard",
  "sparkline",
  "sparkbar",
  "win-loss",
  "bullet",
  "progress-ring",
  "gauge",
  "split-bar",
]);

export function formHref(chart: Chart): string {
  return `/diagrammatic/docs/charts/${chart.slug}`;
}

function Plate({ chart }: { chart: Chart }) {
  return (
    <Link
      href={formHref(chart)}
      className={cn(
        plateSurface,
        "group rounded-document hover:bg-foreground/[0.05] dark:hover:bg-foreground/[0.07] focus-visible:outline-ring flex flex-col p-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "flex min-h-32 flex-1 items-center justify-center py-3",
          !TEXT_CHARTS.has(chart.slug) &&
            "[&_[data-part=legend]]:hidden [&_text]:hidden",
        )}
      >
        <div className="w-full max-w-60">{chart.glyph}</div>
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{chart.name}</span>
        <span className="text-muted-foreground text-xs tabular-nums">
          {String(chart.index).padStart(2, "0")}
        </span>
      </div>
    </Link>
  );
}

export function FormWall({ stacked = false }: { stacked?: boolean }) {
  return (
    <div className="flex flex-col gap-16 md:gap-20">
      {CHART_SECTIONS.map((section) => (
        <section
          key={section.label}
          id={sectionId(section.label)}
          className={cn(
            "not-prose grid scroll-mt-24 gap-6",
            !stacked && "lg:grid-cols-[15rem_1fr] lg:gap-10",
          )}
        >
          <div className={cn(!stacked && "lg:sticky lg:top-24 lg:self-start")}>
            <h3 className="font-medium">
              <Link
                href={`/diagrammatic/docs/charts#${sectionId(section.label)}`}
                className="hover:underline hover:underline-offset-4"
              >
                {section.label}
              </Link>
            </h3>
            <p className="text-muted-foreground mt-2 max-w-[40ch] text-sm leading-relaxed">
              {section.intro}
            </p>
          </div>
          <div
            className={cn(
              "grid grid-cols-2 gap-2 sm:grid-cols-3",
              !stacked && "xl:grid-cols-4",
            )}
          >
            {section.charts.map((chart) => (
              <Plate key={chart.slug} chart={chart} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
