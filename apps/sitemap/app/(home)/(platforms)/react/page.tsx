import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ThreadPreview } from "@/components/demos/thread.preview";
import { Highlight } from "@/components/shared/highlight";
import { PageFrame } from "@/components/shared/page-frame";
import { DemoFrame } from "@/components/shared/demo-frame";
import { PageHero } from "@/components/shared/page-hero";
import { CodeBlock } from "@/components/ui/code-block";

export const metadata: Metadata = {
  title: "assistant-ui for React",
  description:
    "Thread, Composer, and Message primitives for React, on the runtime every assistant-ui platform shares.",
};

const PRIMITIVES = [
  "Thread",
  "ThreadList",
  "ThreadListItem",
  "ThreadListItemMore",
  "Message",
  "MessagePart",
  "Composer",
  "ActionBar",
  "ActionBarMore",
  "Attachment",
  "BranchPicker",
  "ChainOfThought",
  "Error",
  "QueueItem",
  "Suggestion",
  "SelectionToolbar",
  "AssistantModal",
] as const;

const FEATURES = [
  {
    title: "Any backend",
    description:
      "The AI SDK, LangGraph, or your own API, each through a runtime adapter.",
  },
  {
    title: "Styled or unstyled",
    description:
      "Install styled components from the registry with shadcn, or build on the unstyled primitives.",
  },
  {
    title: "Shared runtime",
    description:
      "The same engine as the React Native, Ink, and Vue packages. Tools and adapters carry over.",
  },
] as const;

const SNIPPET = `"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime, AssistantChatTransport } from "@assistant-ui/ai-sdk";
import { ThreadList } from "@/components/assistant-ui/elements/thread-list.aui";
import { Thread } from "@/components/assistant-ui/elements/thread.aui";

export default function MyApp() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({
      api: "/api/chat",
    }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div>
        <ThreadList />
        <Thread />
      </div>
    </AssistantRuntimeProvider>
  );
}`;

export default function ReactPage() {
  return (
    <PageFrame pad="sub">
      <PageHero
        title="AI chat, on the web."
        deck="Thread, Composer, and Message primitives for React, on the runtime every assistant-ui platform shares. Bring any backend through an adapter."
        primary={{ label: "Read the docs", href: "/docs" }}
        secondary={{ install: "npx assistant-ui@latest create my-app" }}
        demo={
          <DemoFrame
            caption="The Thread, with replies from a script."
            frameClassName="h-[30rem]"
          >
            <ThreadPreview />
          </DemoFrame>
        }
      />
      <div className="border-foreground/10 mt-16 border-t md:mt-20">
        <section className="border-foreground/10 border-b py-10 md:py-12">
          <p className="text-sm font-medium">The setup</p>
          <CodeBlock
            title="app/page.tsx · from the manual installation guide"
            className="my-0 mt-6 max-w-[44rem]"
          >
            <Highlight code={SNIPPET} language="tsx" />
          </CodeBlock>
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
              <span key={name}>{name}</span>
            ))}
          </p>
          <p className="text-muted-foreground/70 mt-6 max-w-[52ch] text-sm leading-relaxed">
            Composable and unstyled. The other platforms adapt this component
            model to their own views.
          </p>
        </section>

        <section className="divide-foreground/10 border-foreground/10 grid gap-8 border-b py-10 md:grid-cols-3 md:gap-0 md:divide-x md:py-12">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="md:px-8 md:first:ps-0 md:last:pe-0"
            >
              <h2 className="text-sm font-medium">{feature.title}</h2>
              <p className="text-muted-foreground mt-2 text-sm leading-relaxed text-pretty">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </div>

      <footer className="mt-16 flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          The same runtime ships for{" "}
          <Link
            href="/react-native"
            className="text-foreground font-medium transition-colors"
          >
            React Native
          </Link>
          , the{" "}
          <Link
            href="/ink"
            className="text-foreground font-medium transition-colors"
          >
            terminal
          </Link>
          , and{" "}
          <Link
            href="/vue"
            className="text-foreground font-medium transition-colors"
          >
            Vue
          </Link>
          .
        </p>
        <Link
          href="/docs/installation"
          className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1.5 text-sm transition-colors"
        >
          Installation
          <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </footer>
    </PageFrame>
  );
}
