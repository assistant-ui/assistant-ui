"use client";

import {
  ArrowRight,
  GitBranch,
  Paintbrush,
  Puzzle,
  Radio,
  Tags,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { CopyCommandButton } from "@/components/home/copy-command-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { WaterfallSample } from "@/components/docs/samples/o11y/waterfall";
import {
  CollapseSample,
  StatusSample,
  StreamingSample,
} from "@/components/docs/samples/o11y/capability-samples";

const ANALYTICS_PAGE = "react-o11y" as const;

const INSTALL_COMMAND = "npm install @assistant-ui/react-o11y";

const FEATURES = [
  {
    title: "Fully Headless",
    description:
      "Zero styling opinions. Every part is a plain element exposing data attributes; bring your own CSS or Tailwind.",
    icon: Paintbrush,
    iconColor: "text-pink-400",
  },
  {
    title: "Radix-Style Composable",
    description:
      "Compound primitives you fully control. Root, Indent, CollapseToggle, StatusIndicator, TypeBadge, Name, Children.",
    icon: Puzzle,
    iconColor: "text-blue-400",
  },
  {
    title: "Tree-Aware",
    description:
      "Depth, child counts, collapse state, and the global time range are computed for you from a flat span array.",
    icon: GitBranch,
    iconColor: "text-green-400",
  },
  {
    title: "Reactive",
    description:
      "Built on the assistant-ui store. Push new spans and the UI updates live; running spans animate as they stream.",
    icon: Radio,
    iconColor: "text-orange-400",
  },
  {
    title: "Style by Status & Type",
    description:
      "data-span-status and data-span-type drive your colors and badges with pure CSS, no conditional render logic.",
    icon: Tags,
    iconColor: "text-purple-400",
  },
  {
    title: "Any Data Source",
    description:
      "Map spans from OpenTelemetry, Langfuse, LangSmith, or your own backend into SpanData and render in minutes.",
    icon: Workflow,
    iconColor: "text-cyan-400",
  },
] as const;

const CAPABILITIES = [
  {
    title: "Status at a glance",
    description:
      "running, completed, failed, and skipped each styled from data-span-status.",
    demo: StatusSample,
  },
  {
    title: "Collapsible subtrees",
    description:
      "CollapseToggle removes a span's descendants from the visible list, not just hides them.",
    demo: CollapseSample,
  },
  {
    title: "Streams in live",
    description:
      "Push spans over time and the tree grows; running spans animate until they settle.",
    demo: StreamingSample,
  },
] as const;

export default function ReactO11yPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pt-14 pb-8 md:space-y-20">
      {/* Hero */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="mx-auto max-w-2xl text-3xl font-medium tracking-tight md:text-5xl">
            Observability span primitives for React
          </h1>
          <p className="text-muted-foreground mx-auto max-w-xl text-lg">
            Headless, Radix-style primitives for rendering agent traces,
            sub-agent trees, and run timelines as collapsible waterfalls.
            Composable, unstyled, and fully reactive.
          </p>
        </div>

        <CopyCommandButton
          command={INSTALL_COMMAND}
          analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
        />

        <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[13px]">
          <Link
            href="/docs/utilities/react-o11y"
            className="text-foreground/60 hover:text-foreground font-medium transition-colors"
          >
            Documentation →
          </Link>
          <span className="text-border">·</span>
          <span>Experimental, API may change</span>
        </div>
      </div>

      {/* Flagship live demo */}
      <div className="mx-auto max-w-4xl">
        <WaterfallSample />
        <p className="text-muted-foreground mt-3 text-center text-xs">
          A live span waterfall. Collapse subtrees, and hold ⌘/Ctrl while
          scrolling to zoom the timeline.
        </p>
      </div>

      {/* Capabilities */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-medium tracking-tight">
            Compose any trace UI
          </h2>
          <p className="text-muted-foreground max-w-xl">
            The same primitives drive a Gantt-style waterfall or a plain tree.
            You decide the layout; the resource handles the data.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {CAPABILITIES.map((capability) => {
            const Demo = capability.demo;
            return (
              <div
                key={capability.title}
                className="border-border/50 bg-muted/30 flex flex-col gap-4 rounded-xl border p-4"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{capability.title}</span>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {capability.description}
                  </p>
                </div>
                <div className="flex flex-1 items-start justify-center">
                  <Demo />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="text-3xl font-medium tracking-tight">
            Why react-o11y?
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Everything you need to build trace inspectors and run timelines,
            without fighting your styling framework or losing control.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="border-border/50 bg-muted/30 hover:border-border/80 flex flex-col gap-2 rounded-xl border p-4 transition-colors"
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
        <p className="text-2xl font-medium tracking-tight">
          Start building today
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/docs/utilities/react-o11y">
              Documentation <ArrowRight />
            </Link>
          </Button>
          <Link
            href="https://github.com/assistant-ui/assistant-ui/tree/main/packages/react-o11y"
            className={buttonVariants({ variant: "outline" })}
          >
            View on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
