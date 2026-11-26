import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageFrame } from "@/components/shared/page-frame";
import { DemoSetupPanel } from "@/components/shared/demo-setup-panel";
import { PageHero } from "@/components/shared/page-hero";
import { WaterfallSample } from "@/components/pages/docs/samples/o11y/waterfall.lazy";
import {
  CollapseSample,
  StatusSample,
  StreamingSample,
} from "@/components/pages/docs/samples/o11y/capability-samples";
import { subProject } from "@/lib/docs-sites";

const { title, description } = subProject("react-o11y");

export const metadata: Metadata = { title, description };

const DOCS = "/docs/utilities/react-o11y";

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

const TRACE_VIEW = `"use client";

import {
  SpanPrimitive,
  SpanResource,
  type SpanData,
} from "@assistant-ui/react-o11y";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";

function SpanRow() {
  return (
    <SpanPrimitive.Root className="flex items-center gap-2 py-1">
      <SpanPrimitive.Indent />
      <SpanPrimitive.CollapseToggle className="size-4 cursor-pointer">
        ▸
      </SpanPrimitive.CollapseToggle>
      <SpanPrimitive.StatusIndicator className="size-2 rounded-full data-[span-status=running]:bg-yellow-500 data-[span-status=completed]:bg-green-500 data-[span-status=failed]:bg-red-500" />
      <SpanPrimitive.TypeBadge className="rounded bg-muted px-1.5 text-xs" />
      <SpanPrimitive.Name className="text-sm" />
    </SpanPrimitive.Root>
  );
}

export function TraceView({ spans }: { spans: SpanData[] }) {
  const config = AuiConfig({ span: SpanResource({ spans }) });
  return (
    <AuiProvider extends={null} config={config}>
      <SpanPrimitive.Children components={{ Span: SpanRow }} />
    </AuiProvider>
  );
}`;

const TRACE_TIMELINE = `"use client";

import {
  SpanPrimitive,
  SpanResource,
  type SpanData,
} from "@assistant-ui/react-o11y";
import { AuiConfig, AuiProvider } from "@assistant-ui/store";

export function TraceTimeline({ spans }: { spans: SpanData[] }) {
  const config = AuiConfig({ span: SpanResource({ spans }) });
  return (
    <AuiProvider extends={null} config={config}>
      <SpanPrimitive.Timeline>
        <SpanPrimitive.Children>
          {() => (
            <div className="relative h-8">
              <SpanPrimitive.TimelineBar className="top-1 h-6 rounded bg-blue-500" />
            </div>
          )}
        </SpanPrimitive.Children>
      </SpanPrimitive.Timeline>
    </AuiProvider>
  );
}`;

export default function ReactO11yPage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="The anatomy of a run."
        deck="Headless, Radix-style primitives for agent traces, sub-agent trees, and run timelines: collapsible waterfalls on the assistant-ui store. Unstyled and fully reactive."
        primary={{ label: "Read the docs", href: DOCS }}
        secondary={{ install: "npm install @assistant-ui/react-o11y" }}
        showcase={
          <DemoSetupPanel
            demo={
              // The sample caps its list at a fixed height inside its own border; this drops the border and lets the list fill the frame.
              <div className="flex size-full flex-col *:flex *:min-h-0 *:flex-1 *:flex-col *:rounded-none *:border-0 [&>div>div:first-child]:max-h-none! [&>div>div:first-child]:min-h-0 [&>div>div:first-child]:flex-1">
                <WaterfallSample />
              </div>
            }
            demoCaption="A live waterfall. Collapse subtrees, or hold ⌘ and scroll to zoom."
            files={[
              {
                path: "components/trace-view.tsx",
                language: "tsx",
                code: TRACE_VIEW,
              },
              {
                path: "components/trace-timeline.tsx",
                language: "tsx",
                code: TRACE_TIMELINE,
              },
            ]}
            setupCaption="The quick start and the TimelineBar example, from the docs."
            frameClassName="h-[34rem]"
          />
        }
      />

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
            <p className="text-sm font-medium">The primitives</p>
            <span className="text-muted-foreground text-sm tabular-nums">
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
          <p className="text-muted-foreground/70 mt-2 max-w-[52ch] text-sm leading-relaxed">
            Experimental. The API may change without notice.
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
          Built on{" "}
          <Link href="/oss" className="text-foreground font-medium">
            @assistant-ui/store
          </Link>
          , the reactive core the whole library shares.
        </p>
        <Link
          href={DOCS}
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Full reference on the docs
          <ArrowRight
            aria-hidden
            className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5"
          />
        </Link>
      </footer>
    </PageFrame>
  );
}
