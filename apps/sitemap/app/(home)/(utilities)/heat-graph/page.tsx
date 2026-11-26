import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { HeatGraphDemo } from "./heat-graph-demo";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { PageFrame } from "@/components/shared/page-frame";
import { PageHero } from "@/components/shared/page-hero";
import { subProject, subProjectGithubUrl } from "@/lib/docs-sites";

const { title, description } = subProject("heat-graph");

export const metadata: Metadata = { title, description };

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

const QUICK_START = `"use client";

import * as HeatGraph from "heat-graph";

const COLORS = ["#ebedf0", "#c6d7f9", "#8fb0f3", "#5888e8", "#2563eb"];

export function ActivityGraph({ data }: { data: HeatGraph.DataPoint[] }) {
  return (
    <HeatGraph.Root data={data} weekStart="monday" colorScale={COLORS}>
      <HeatGraph.Grid className="gap-[3px]">
        {() => (
          <HeatGraph.Cell className="aspect-square rounded-sm" />
        )}
      </HeatGraph.Grid>
      <HeatGraph.Tooltip>
        {({ cell }) => (
          <div>
            {cell.count} contributions on {cell.date.toLocaleDateString()}
          </div>
        )}
      </HeatGraph.Tooltip>
    </HeatGraph.Root>
  );
}`;

export default function HeatGraphPage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="A year, cell by cell."
        deck="GitHub-style activity heatmaps for React. Headless, Radix-style, and composable. The layout, date math, and tooltip wiring; your colors and labels."
        primary={{ label: "Read the docs", href: "/docs/utilities/heat-graph" }}
        secondary={{ install: "npm install heat-graph" }}
        showcase={
          <DemoSetupPanel
            demo={<HeatGraphDemo />}
            demoCaption="The same parts in four themes, on sample data, with each theme's code. Hover a cell."
            files={[
              {
                path: "components/activity-graph.tsx",
                language: "tsx",
                code: QUICK_START,
              },
            ]}
            setupCaption="From the quick start guide."
            frameClassName="h-[40rem]"
          />
        }
      />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">The parts</p>
            <span className="text-muted-foreground text-sm tabular-nums">
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
          <p className="text-sm font-medium">Why headless</p>
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
          href={subProjectGithubUrl("heat-graph")}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Full reference in the README
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transition-none" />
        </a>
      </footer>
    </PageFrame>
  );
}
