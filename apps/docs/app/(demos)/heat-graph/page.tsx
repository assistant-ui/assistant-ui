"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { HeatGraphDemo } from "./heat-graph-demo";

const ANALYTICS_PAGE = "heat-graph" as const;

const INSTALL_COMMAND = "npm install heat-graph";

const PARTS = [
  "Root",
  "Grid",
  "Cell",
  "MonthLabels",
  "DayLabels",
  "Legend",
  "LegendLevel",
  "Tooltip",
  "autoLevels",
  "MONTH_SHORT",
  "DAY_SHORT",
] as const;

const FEATURES = [
  {
    title: "Radix-style composable",
    description:
      "Compound components you fully control. Root, Grid, Cell, Legend, Tooltip. Compose only the pieces you need.",
  },
  {
    title: "Fully headless",
    description:
      "Zero styling opinions. Bring your own CSS, Tailwind, or any styling solution. Every element is a plain div you can style.",
  },
  {
    title: "Tooltip built in",
    description:
      "Hover tooltips powered by Radix Popper for pixel-perfect positioning. No extra dependencies needed.",
  },
  {
    title: "Custom bucketing",
    description:
      "Plug in your own classification function to control how counts map to levels. Defaults to evenly-distributed auto-levels.",
  },
  {
    title: "Localizable",
    description:
      "Month and day labels expose raw numeric values. Format with the included English helpers or use Intl.DateTimeFormat for any locale.",
  },
] as const;

export default function HeatGraphPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>A year, cell by cell.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          GitHub-style activity heatmaps for React. Headless, Radix-style, and
          composable. The layout, date math, and tooltip wiring; your colors and
          labels.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command={INSTALL_COMMAND}
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <Link
            href="/docs/utilities/heat-graph"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
        </div>
      </header>

      <div className="mt-12 md:mt-16">
        <HeatGraphDemo />
      </div>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className={typeEyebrow}>The parts</p>
            <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
              {PARTS.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-6 flex max-w-[52rem] flex-wrap gap-x-6 gap-y-2.5 font-mono text-[13px]">
            {PARTS.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            Eight components plus the level math and label helpers, every
            element a plain div you can style.
          </p>
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className={typeEyebrow}>Why headless</p>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title}>
                <h2 className="text-sm font-medium">{feature.title}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          One of the primitives we extracted along the way,{" "}
          <a href="/oss" className="text-foreground font-medium">
            everything we build in the open
          </a>
          .
        </p>
        <a
          href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/heat-graph"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Full reference in the README
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </footer>
    </PageFrame>
  );
}
