"use client";

import { ChatGPT } from "@/components/example/chatgpt/ChatGPT";
import { Claude } from "@/components/example/claude/Claude";
import { Perplexity } from "@/components/example/perplexity/Perplexity";
import { Shadcn } from "@/components/example/shadcn/Shadcn";
import { Tab } from "@/components/shared/tab";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";

const ExampleWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="h-full overflow-hidden rounded-lg border">{children}</div>
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
    <section>
      <Tab tabs={EXAMPLE_TABS} className="h-[600px]" variant="ghost" />
    </section>
  );
}
