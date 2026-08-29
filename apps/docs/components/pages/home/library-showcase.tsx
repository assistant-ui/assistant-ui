"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type FocusEvent,
  type SVGProps,
} from "react";
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
import { LangChainIcon } from "@/components/icons/langchain";
import { LangGraphIcon } from "@/components/icons/langgraph";
import { MastraIcon } from "@/components/icons/mastra";
import { VercelIcon } from "@/components/icons/vercel";
import { PrimitivesAnatomy } from "@/components/pages/home/primitives-anatomy";
import { typeEyebrow } from "@/components/shared/type";
import { CLOUD_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SLOT_MS = 7000;

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

const SETUP_BRANDS: Record<
  string,
  | {
      Icon: ComponentType<SVGProps<SVGSVGElement>>;
      className: string;
    }
  | undefined
> = {
  "ai-sdk": { Icon: VercelIcon, className: "text-foreground/[0.09]" },
  langgraph: {
    Icon: LangGraphIcon,
    className: "text-[#1C3C3C]/20 dark:text-[#5b9595]/25",
  },
  langchain: {
    Icon: LangChainIcon,
    className: "text-[#7FC8FF]/35 dark:text-[#7FC8FF]/20",
  },
  mastra: { Icon: MastraIcon, className: "text-foreground/[0.09]" },
};

function useAutoCycle(count: number) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const frozen = !visible || hovered || pageHidden || reduceMotion;

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.3 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => setReduceMotion(motion.matches);
    applyMotion();
    motion.addEventListener("change", applyMotion);

    const applyVisibility = () => setPageHidden(document.hidden);
    applyVisibility();
    document.addEventListener("visibilitychange", applyVisibility);

    return () => {
      motion.removeEventListener("change", applyMotion);
      document.removeEventListener("visibilitychange", applyVisibility);
    };
  }, []);

  useEffect(() => {
    if (frozen) return;
    const id = window.setTimeout(() => {
      setIndex((current) => (current + 1) % count);
      setEpoch((current) => current + 1);
    }, SLOT_MS);
    return () => window.clearTimeout(id);
  }, [frozen, index, epoch, count]);

  const jump = (next: number) => {
    setIndex(next);
    setEpoch((current) => current + 1);
  };

  return {
    rootRef,
    index,
    epoch,
    frozen,
    visible,
    jump,
    hold: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocus: () => setHovered(true),
      onBlur: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setHovered(false);
        }
      },
    },
  };
}

function CycleProgress({
  playKey,
  frozen,
}: {
  playKey: string;
  frozen: boolean;
}) {
  return (
    <span className="bg-foreground/10 absolute inset-x-0 bottom-0 h-px overflow-hidden">
      <span
        key={playKey}
        className="block h-full origin-left bg-blue-500"
        style={
          frozen
            ? { transform: "scaleX(0)" }
            : { animation: `stage-progress ${SLOT_MS}ms linear forwards` }
        }
      />
    </span>
  );
}

function Stage() {
  const cycle = useAutoCycle(ACTS.length);
  const act = ACTS[cycle.index]!;
  const Act = act.Component;

  return (
    <div
      ref={cycle.rootRef}
      className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-12"
      {...cycle.hold}
    >
      <ol className="flex flex-wrap gap-x-5 gap-y-2 md:flex-col md:gap-y-3">
        {ACTS.map((item, index) => {
          const current = index === cycle.index;
          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => cycle.jump(index)}
                className={cn(
                  "relative flex items-baseline gap-2.5 pb-1.5 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors",
                  current
                    ? "text-foreground"
                    : "text-foreground/35 hover:text-foreground/70",
                )}
              >
                <span className="tabular-nums">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.label}
                {current ? (
                  <CycleProgress
                    playKey={`${cycle.index}-${cycle.epoch}-${String(cycle.frozen)}`}
                    frozen={cycle.frozen}
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex min-w-0 flex-col gap-3">
        <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex min-h-[340px] flex-1 items-center justify-center overflow-hidden px-6 py-10 md:min-h-[380px] md:px-12">
          {cycle.visible ? (
            <div
              key={`${cycle.index}-${cycle.epoch}`}
              className="animate-in fade-in-0 w-full duration-500"
              style={{ maxWidth: act.maxWidth ?? "30rem" }}
            >
              <Act />
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[11px] tracking-wide">
          {act.docs ? (
            <Link
              key={`act-docs-${cycle.index}`}
              href={act.docs}
              className="animate-in fade-in-0 text-muted-foreground hover:text-foreground transition-colors duration-500"
            >
              read the {act.label} guide →
            </Link>
          ) : (
            <span />
          )}
          <Link
            href="/elements"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            All elements →
          </Link>
        </div>
      </div>
    </div>
  );
}

export type SetupTab = {
  id: string;
  label: string;
  caption: string;
  docs: string;
  html: string;
};

function SetupPanel({ tabs }: { tabs: SetupTab[] }) {
  const cycle = useAutoCycle(tabs.length);
  const activeTab = tabs[cycle.index] ?? tabs[0];
  const brand = activeTab ? SETUP_BRANDS[activeTab.id] : undefined;

  return (
    <div ref={cycle.rootRef} className="flex flex-col gap-5" {...cycle.hold}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="flex max-w-[44rem] flex-col gap-2">
          <p className={typeEyebrow}>The setup</p>
          <p className="text-[15px] font-medium">
            A provider, a hook, one component.{" "}
            <span className="text-muted-foreground font-normal">
              The complete client, whatever runs behind it.
            </span>
          </p>
        </div>
        <div role="tablist" className="flex flex-wrap gap-x-5 gap-y-1">
          {tabs.map((tab, index) => {
            const current = index === cycle.index;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={current}
                onClick={() => cycle.jump(index)}
                className={cn(
                  "relative pb-1.5 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors",
                  current
                    ? "text-foreground"
                    : "text-foreground/35 hover:text-foreground/70",
                )}
              >
                {tab.label}
                {current ? (
                  <CycleProgress
                    playKey={`${cycle.index}-${cycle.epoch}-${String(cycle.frozen)}`}
                    frozen={cycle.frozen}
                  />
                ) : null}
              </button>
            );
          })}
          <Link
            href="/docs/runtimes/pick-a-runtime"
            className="text-muted-foreground hover:text-foreground pb-1.5 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors"
          >
            All runtimes →
          </Link>
        </div>
      </div>

      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document relative min-h-[22.5rem] overflow-hidden">
        {brand && activeTab ? (
          <div
            key={activeTab.id}
            className={cn(
              "animate-in fade-in-0 pointer-events-none absolute right-6 bottom-6 [mask-image:radial-gradient(circle,#000_40%,transparent_44%)] [mask-size:5px_5px] duration-700 md:right-10 md:bottom-8",
              brand.className,
            )}
          >
            <brand.Icon className="size-40 md:size-52" />
          </div>
        ) : null}
        <div
          key={`code-${activeTab?.id ?? "none"}`}
          className="code-cascade relative min-w-0 overflow-x-auto px-6 pt-6 font-mono text-[13px] leading-relaxed md:px-10 [&_.line]:pr-0! [&_.line]:pl-2.5! [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
          dangerouslySetInnerHTML={{ __html: activeTab?.html ?? "" }}
        />
        <div
          key={`caption-${activeTab?.id ?? "none"}`}
          className="animate-in fade-in-0 relative flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-6 pt-4 pb-6 font-mono text-[11px] tracking-wide duration-500 md:px-10"
        >
          <p className="text-muted-foreground">{activeTab?.caption}</p>
          {activeTab ? (
            <Link
              href={activeTab.docs}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              read the {activeTab.label} guide →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function LibraryShowcase({ setupTabs }: { setupTabs: SetupTab[] }) {
  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <div className="border-foreground/10 border-t pt-8">
        <SetupPanel tabs={setupTabs} />
      </div>

      <div className="border-foreground/10 flex flex-col gap-6 border-t pt-8">
        <p className={typeEyebrow}>What the runtime handles</p>
        <Stage />
      </div>

      <div className="border-foreground/10 flex flex-col gap-5 border-t pt-8">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="flex max-w-[44rem] flex-col gap-2">
            <p className={typeEyebrow}>The primitives</p>
            <p className="text-[15px] font-medium">
              Yours to reshape.{" "}
              <span className="text-muted-foreground font-normal">
                Every part is a component you compose; the CLI copies the UI
                source into your repo.
              </span>
            </p>
          </div>
          <Link
            href="/elements/thread"
            className="text-muted-foreground hover:text-foreground pb-1.5 font-mono text-[11px] font-medium tracking-wide uppercase transition-colors"
          >
            Customize the thread →
          </Link>
        </div>
        <PrimitivesAnatomy />
      </div>

      <p className="text-muted-foreground max-w-[64ch] text-[13px] leading-relaxed">
        Works with{" "}
        <Link
          href="/docs/runtimes/ai-sdk"
          className="hover:text-foreground transition-colors"
        >
          AI SDK
        </Link>
        ,{" "}
        <Link
          href="/docs/runtimes/langgraph"
          className="hover:text-foreground transition-colors"
        >
          LangGraph
        </Link>
        , and{" "}
        <Link
          href="/docs/runtimes/langchain"
          className="hover:text-foreground transition-colors"
        >
          LangChain
        </Link>
        , or any backend through adapters. Ships for React, Native, and Ink.{" "}
        <Link
          href="/elements"
          className="hover:text-foreground transition-colors"
        >
          Elements
        </Link>{" "}
        extends it.{" "}
        <a href={CLOUD_URL} className="hover:text-foreground transition-colors">
          Cloud
        </a>{" "}
        hosts threads and persistence when you want them.
      </p>
    </div>
  );
}
