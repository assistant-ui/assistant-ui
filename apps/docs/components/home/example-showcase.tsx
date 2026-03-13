"use client";

import { ChatGPT } from "@/components/examples/chatgpt";
import { Claude } from "@/components/examples/claude";
import { Perplexity } from "@/components/examples/perplexity";
import { Shadcn } from "@/components/examples/shadcn";
import { Tab } from "@/components/shared/tab";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { Grok } from "@/components/examples/grok";
import { analytics } from "@/lib/analytics";

const ExampleWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="not-prose h-full overflow-hidden rounded-lg border">
    {children}
  </div>
);

const EXAMPLE_TABS = [
  {
    label: "Shadcn",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Shadcn />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "ChatGPT",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <ChatGPT />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Claude",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Claude />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Grok",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Grok />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Perplexity",
    value: (
      <ExampleWrapper>
        <DocsRuntimeProvider>
          <Perplexity />
        </DocsRuntimeProvider>
      </ExampleWrapper>
    ),
  },
  {
    label: "Explore More →",
    href: "/examples",
  },
];

export function ExampleShowcase() {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-3xl tracking-tight">
          Clone any chat UI
        </h2>
        <p className="text-muted-foreground">
          Fully customizable — match the look and feel of any product.
        </p>
      </div>
      <Tab
        tabs={EXAMPLE_TABS}
        className="h-160"
        variant="ghost"
        onTabChange={(label) => analytics.example.tabSwitched(label)}
      />
    </section>
  );
}
