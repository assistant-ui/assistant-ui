"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { PageFrame } from "@/components/shared/page-frame";
import { typeDeck, typeEyebrow, typePage } from "@/components/shared/type";
import { cn } from "@/lib/utils";
import { WaterfallSample } from "@/components/pages/docs/samples/o11y/waterfall";
import {
  CollapseSample,
  StatusSample,
  StreamingSample,
} from "@/components/pages/docs/samples/o11y/capability-samples";

const ANALYTICS_PAGE = "react-o11y" as const;

const INSTALL_COMMAND = "npm install @assistant-ui/react-o11y";

const PRIMITIVES = [
  "SpanResource",
  "Root",
  "Children",
  "Indent",
  "Name",
  "StatusIndicator",
  "TypeBadge",
  "CollapseToggle",
  "Timeline",
  "TimelineBar",
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

const FEATURES = [
  {
    title: "Fully headless",
    description:
      "Zero styling opinions. Every part is a plain element exposing data attributes; bring your own CSS or Tailwind.",
  },
  {
    title: "Radix-style composable",
    description:
      "Compound primitives you fully control. Root, Indent, CollapseToggle, StatusIndicator, TypeBadge, Name, Children.",
  },
  {
    title: "Tree-aware",
    description:
      "Depth, child counts, collapse state, and the global time range are computed for you from a flat span array.",
  },
  {
    title: "Reactive",
    description:
      "Built on the assistant-ui store. Push new spans and the UI updates live; running spans animate as they stream.",
  },
  {
    title: "Style by status and type",
    description:
      "data-span-status and data-span-type drive your colors and badges with pure CSS, no conditional render logic.",
  },
  {
    title: "Any data source",
    description:
      "Map spans from OpenTelemetry, Langfuse, LangSmith, or your own backend into SpanData and render in minutes.",
  },
] as const;

export default function ReactO11yPage() {
  return (
    <PageFrame pad="sub">
      <header className="max-w-2xl">
        <h1 className={typePage}>The anatomy of a run.</h1>
        <p className={cn(typeDeck, "mt-4 max-w-[52ch]")}>
          Headless, Radix-style primitives for agent traces, sub-agent trees,
          and run timelines: collapsible waterfalls on the assistant-ui store.
          Unstyled and fully reactive.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <CopyCommandButton
            command={INSTALL_COMMAND}
            analyticsContext={{ page: ANALYTICS_PAGE, section: "hero" }}
          />
          <Link
            href="/docs/utilities/react-o11y"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Read the docs
          </Link>
          <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide">
            experimental · api may change
          </span>
        </div>
      </header>

      <figure className="mt-12 md:mt-16">
        <WaterfallSample />
        <figcaption className="text-muted-foreground/70 mt-2 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[11px] tracking-wide">
          <span>fig. 01 · a live waterfall</span>
          <span>collapse subtrees · hold ⌘ and scroll to zoom</span>
        </figcaption>
      </figure>

      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="divide-foreground/10 border-foreground/10 grid gap-10 border-b py-10 md:grid-cols-3 md:gap-0 md:divide-x md:py-12">
          {CAPABILITIES.map((capability) => {
            const Demo = capability.demo;
            return (
              <div
                key={capability.title}
                className="flex flex-col md:px-8 md:first:ps-0 md:last:pe-0"
              >
                <h2 className="text-sm font-medium">{capability.title}</h2>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                  {capability.description}
                </p>
                <div className="mt-5 flex flex-1 items-start">
                  <Demo />
                </div>
              </div>
            );
          })}
        </section>

        <section className="border-foreground/10 border-b py-10 md:py-12">
          <div className="flex items-baseline justify-between">
            <p className={typeEyebrow}>The primitives</p>
            <span className="text-muted-foreground/60 font-mono text-[11px] tracking-wide tabular-nums">
              {PRIMITIVES.length}
            </span>
          </div>
          <p className="text-muted-foreground mt-6 flex max-w-[52rem] flex-wrap gap-x-6 gap-y-2.5 font-mono text-[13px]">
            {PRIMITIVES.map((name) => (
              <span key={name}>
                {name === "SpanResource" ? name : `SpanPrimitive.${name}`}
              </span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            One resource owns the data; nine parts lay it out. The same
            primitives drive a Gantt-style waterfall or a plain tree.
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
          Built on{" "}
          <a href="/oss" className="text-foreground font-medium">
            @assistant-ui/store
          </a>{" "}
          the reactive core the whole library shares.
        </p>
        <Link
          href="/docs/utilities/react-o11y"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Full reference on the docs
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}
