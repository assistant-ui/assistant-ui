"use client";

import {
  ArrowRight,
  Blocks,
  Globe,
  Paintbrush,
  Puzzle,
  Scaling,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { HeatGraphDemo } from "./heat-graph-demo";

const ANALYTICS_PAGE = "heat-graph" as const;

const INSTALL_COMMAND = "npm install heat-graph";

const FEATURES = [
  {
    title: "Radix-Style Composable",
    description:
      "Compound components you fully control. Root, Grid, Cell, Legend, Tooltip — compose only the pieces you need.",
    icon: Puzzle,
    iconColor: "text-blue-400",
  },
  {
    title: "Fully Headless",
    description:
      "Zero styling opinions. Bring your own CSS, Tailwind, or any styling solution. Every element is a plain div you can style.",
    icon: Paintbrush,
    iconColor: "text-pink-400",
  },
  {
    title: "Tooltip Built-in",
    description:
      "Hover tooltips powered by Radix Popper for pixel-perfect positioning. No extra dependencies needed.",
    icon: Blocks,
    iconColor: "text-purple-400",
  },
  {
    title: "Custom Bucketing",
    description:
      "Plug in your own classification function to control how counts map to levels. Defaults to evenly-distributed auto-levels.",
    icon: Scaling,
    iconColor: "text-green-400",
  },
  {
    title: "Localizable",
    description:
      "Month and day labels expose raw numeric values. Format with the included English helpers or use Intl.DateTimeFormat for any locale.",
    icon: Globe,
    iconColor: "text-orange-400",
  },
] as const;

export default function HeatGraphPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-20">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="mx-auto max-w-2xl font-medium text-3xl tracking-tight md:text-5xl">
            GitHub-style activity heatmaps for React
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            Headless, Radix-style primitives for building activity heatmap
            graphs. Composable, unstyled, and fully customizable.
          </p>
        </div>

        <CopyCommandButton
          command={INSTALL_COMMAND}
          analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
        />

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[13px] text-muted-foreground">
          <Link
            href="/docs/utilities/heat-graph"
            className="font-medium text-foreground/60 transition-colors hover:text-foreground"
          >
            Documentation →
          </Link>
        </div>
      </div>

      {/* Live demo */}
      <div className="mx-auto max-w-4xl">
        <HeatGraphDemo />
      </div>

      {/* Features */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="font-medium text-3xl tracking-tight">
            Why Heat Graph?
          </h2>
          <p className="max-w-xl text-muted-foreground">
            Everything you need to build activity heatmaps — without fighting
            your styling framework or losing control.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:border-border/80"
              >
                <span className="flex items-center gap-2 font-medium">
                  <Icon className={cn("size-4", feature.iconColor)} />
                  {feature.title}
                </span>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-6 py-16 text-center">
        <p className="font-medium text-2xl tracking-tight">
          Start building today
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/docs/utilities/heat-graph">
              Documentation <ArrowRight />
            </Link>
          </Button>
          <Link
            href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/heat-graph"
            className={buttonVariants({ variant: "outline" })}
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
