"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import Link from "next/link";
import { ApprovalCardDemo } from "@/components/demo/elements/approval-card";
import { ChartDemo } from "@/components/demo/elements/chart";
import { ComposerVoiceDemo } from "@/components/demo/elements/composer-voice";
import { MessageAttachmentDemo } from "@/components/demo/elements/message-attachment";
import { MessageBranchesDemo } from "@/components/demo/elements/message-branches";
import { ReasoningPanelDemo } from "@/components/demo/elements/reasoning-panel";
import { SourcesDemo } from "@/components/demo/elements/sources";
import { StreamingTextDemo } from "@/components/demo/elements/streaming-text";
import { SuggestionsDemo } from "@/components/demo/elements/suggestions";
import { ToolCallDemo } from "@/components/demo/elements/tool-call";
import { PrimitivesAnatomy } from "@/components/pages/home/primitives-anatomy";
import { CopyButton } from "@/components/shared/copy-button";
import { typeSection } from "@/components/shared/type";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CLOUD_URL } from "@/lib/constants";

const ACTS: {
  label: string;
  Component: ComponentType;
  maxWidth?: string;
  docs?: string;
}[] = [
  { label: "Streaming", Component: StreamingTextDemo },
  {
    label: "Reasoning",
    docs: "/elements/reasoning",
    Component: ReasoningPanelDemo,
  },
  { label: "Tools", docs: "/docs/tools", Component: ToolCallDemo },
  {
    label: "Approval",
    docs: "/docs/tools/tool-ui",
    Component: ApprovalCardDemo,
  },
  { label: "Sources", docs: "/elements/sources", Component: SourcesDemo },
  {
    label: "Attachments",
    docs: "/docs/guides/attachments",
    Component: MessageAttachmentDemo,
  },
  {
    label: "Branching",
    docs: "/docs/guides/branching",
    Component: MessageBranchesDemo,
  },
  {
    label: "Suggestions",
    docs: "/docs/guides/suggestions",
    Component: SuggestionsDemo,
  },
  {
    label: "Voice",
    docs: "/docs/guides/voice",
    Component: ComposerVoiceDemo,
    maxWidth: "34rem",
  },
  {
    label: "Generative UI",
    docs: "/docs/tools/generative-ui",
    Component: ChartDemo,
  },
];

function Stage() {
  const root = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={root}>
      <Tabs defaultValue={ACTS[0]!.label} className="gap-5">
        <TabsList
          activateOnFocus
          variant="line"
          aria-label="Runtime capabilities"
          className="h-auto flex-wrap justify-start gap-x-5 gap-y-1 p-0"
        >
          {ACTS.map((act) => (
            <TabsTrigger
              key={act.label}
              value={act.label}
              className="min-h-11 flex-none px-0 text-sm"
            >
              {act.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {ACTS.map(({ label, docs, maxWidth, Component }) => (
          <TabsContent
            key={label}
            value={label}
            className="flex flex-col gap-3"
          >
            <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex min-h-[22rem] items-center justify-center overflow-hidden px-4 py-8 sm:px-8 md:min-h-[26rem]">
              <div className="w-full" style={{ maxWidth: maxWidth ?? "30rem" }}>
                {visible ? <Component /> : null}
              </div>
            </div>
            <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 text-sm">
              {docs ? (
                <Link
                  href={docs}
                  className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
                >
                  Read the {label} guide →
                </Link>
              ) : (
                <span />
              )}
              <Link
                href="/elements"
                className="hover:text-foreground inline-flex min-h-11 items-center transition-colors"
              >
                All elements →
              </Link>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export type SetupTab = {
  id: string;
  label: string;
  caption: string;
  docs: string;
  html: string;
  code: string;
};

function SetupPanel({ tabs }: { tabs: SetupTab[] }) {
  return (
    <Tabs defaultValue={tabs[0]?.id} className="gap-5">
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
        <TabsList
          activateOnFocus
          variant="line"
          aria-label="Backend integration"
          className="h-auto flex-wrap justify-start gap-x-6 gap-y-1 p-0"
        >
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="min-h-11 flex-none px-0 text-sm"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <Link
          href="/docs/runtimes/pick-a-runtime"
          className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm transition-colors"
        >
          All runtimes →
        </Link>
      </div>
      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document min-w-0 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-4 px-4 pt-4 sm:px-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {tab.caption}
            </p>
            <CopyButton text={tab.code} className="size-11 shrink-0" />
          </div>
          <div
            className="min-w-0 overflow-x-auto px-4 py-6 font-mono text-[13px] leading-relaxed sm:px-6 [&_.line]:pr-0! [&_.line]:pl-2.5! [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
            dangerouslySetInnerHTML={{ __html: tab.html }}
          />
          <div className="px-4 pb-4 sm:px-6">
            <Link
              href={tab.docs}
              className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm transition-colors"
            >
              Read the {tab.label} guide →
            </Link>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function LibraryShowcase({ setupTabs }: { setupTabs: SetupTab[] }) {
  return (
    <div className="flex flex-col gap-12 md:gap-16">
      <div className="flex flex-col gap-6">
        <p className="max-w-[65ch] text-base leading-relaxed">
          A provider, a hook, one component.{" "}
          <span className="text-muted-foreground">
            The complete client, whatever runs behind it.
          </span>
        </p>
        <SetupPanel tabs={setupTabs} />
      </div>
      <section
        aria-labelledby="runtime-handles-heading"
        className="border-foreground/10 flex flex-col gap-6 border-t pt-10 md:pt-14"
      >
        <h3 id="runtime-handles-heading" className={typeSection}>
          What the runtime handles
        </h3>
        <Stage />
      </section>
      <section
        aria-labelledby="compose-heading"
        className="border-foreground/10 flex flex-col gap-6 border-t pt-10 md:pt-14"
      >
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="flex max-w-[44rem] flex-col gap-3">
            <h3 id="compose-heading" className={typeSection}>
              Every part is a component you compose.
            </h3>
            <p className="text-muted-foreground text-base leading-relaxed">
              The CLI copies the UI source into your repo.
            </p>
          </div>
          <Link
            href="/elements/thread"
            className="text-muted-foreground hover:text-foreground inline-flex min-h-11 items-center text-sm transition-colors"
          >
            Customize the thread →
          </Link>
        </div>
        <PrimitivesAnatomy />
      </section>
      <p className="text-muted-foreground max-w-[70ch] text-base leading-relaxed">
        Works with{" "}
        <Link
          href="/docs/runtimes/ai-sdk/overview"
          className="text-foreground underline-offset-4 hover:underline"
        >
          AI SDK
        </Link>
        ,{" "}
        <Link
          href="/docs/runtimes/langgraph/overview"
          className="text-foreground underline-offset-4 hover:underline"
        >
          LangGraph
        </Link>
        , and{" "}
        <Link
          href="/docs/runtimes/langchain"
          className="text-foreground underline-offset-4 hover:underline"
        >
          LangChain
        </Link>
        , or any backend through adapters. Ships for React, Native, and Ink.{" "}
        <Link
          href="/elements"
          className="text-foreground underline-offset-4 hover:underline"
        >
          Elements
        </Link>{" "}
        extends it.{" "}
        <a
          href={CLOUD_URL}
          className="text-foreground underline-offset-4 hover:underline"
        >
          Cloud
        </a>{" "}
        hosts threads and persistence when you want them.
      </p>
    </div>
  );
}
