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
import { typeEyebrow } from "@/components/shared/type";
import { CLOUD_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const SLOT_MS = 7000;

const ACTS: { label: string; Component: ComponentType; maxWidth?: string }[] = [
  { label: "Streaming", Component: StreamingTextDemo },
  { label: "Reasoning", Component: ReasoningPanelDemo },
  { label: "Tools", Component: ToolCallDemo },
  { label: "Approval", Component: ApprovalCardDemo },
  { label: "Sources", Component: SourcesDemo },
  { label: "Attachments", Component: MessageAttachmentDemo },
  { label: "Branching", Component: MessageBranchesDemo },
  { label: "Suggestions", Component: SuggestionsDemo },
  { label: "Voice", Component: ComposerVoiceDemo, maxWidth: "34rem" },
  { label: "Generative UI", Component: ChartDemo },
];

function Stage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(0);
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
      setActive((index) => (index + 1) % ACTS.length);
      setEpoch((count) => count + 1);
    }, SLOT_MS);
    return () => window.clearTimeout(id);
  }, [frozen, active, epoch]);

  const act = ACTS[active]!;
  const Act = act.Component;

  return (
    <div
      ref={rootRef}
      className="grid gap-6 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-12"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <ol className="flex flex-wrap gap-x-5 gap-y-2 md:flex-col md:gap-y-3">
        {ACTS.map((act, index) => {
          const current = index === active;
          return (
            <li key={act.label}>
              <button
                type="button"
                onClick={() => {
                  setActive(index);
                  setEpoch((count) => count + 1);
                }}
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
                {act.label}
                {current ? (
                  <span className="bg-foreground/10 absolute inset-x-0 bottom-0 h-px overflow-hidden">
                    <span
                      key={`${active}-${epoch}-${String(frozen)}`}
                      className="block h-full origin-left bg-blue-500"
                      style={
                        frozen
                          ? { transform: "scaleX(0)" }
                          : {
                              animation: `stage-progress ${SLOT_MS}ms linear forwards`,
                            }
                      }
                    />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex min-h-[340px] items-center justify-center overflow-hidden px-6 py-10 md:min-h-[380px] md:px-12">
        {visible ? (
          <div
            key={`${active}-${epoch}`}
            className="animate-in fade-in-0 w-full duration-500"
            style={{ maxWidth: act.maxWidth ?? "30rem" }}
          >
            <Act />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function LibraryShowcase({ installHtml }: { installHtml: string }) {
  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <div className="border-foreground/10 grid gap-6 border-t pt-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-12">
        <div className="flex flex-col gap-2.5">
          <p className={typeEyebrow}>The setup</p>
          <p className="text-[15px] font-medium">
            A provider, a hook, one component.
          </p>
          <p className="text-muted-foreground max-w-[36ch] text-[14px] leading-relaxed">
            The complete client. Your model stays behind your own route.
          </p>
        </div>
        <div className="min-w-0">
          <div
            className="bg-foreground/[0.025] dark:bg-foreground/[0.04] overflow-x-auto px-6 py-6 font-mono text-[13px] leading-relaxed md:px-10 [&_.line]:px-0! [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
            dangerouslySetInnerHTML={{ __html: installHtml }}
          />
        </div>
      </div>

      <div className="border-foreground/10 flex flex-col gap-6 border-t pt-8">
        <p className={typeEyebrow}>What the runtime handles</p>
        <Stage />
      </div>

      <div className="border-foreground/10 grid gap-6 border-t pt-8 md:grid-cols-[minmax(0,20rem)_1fr] md:gap-12">
        <div className="flex flex-col gap-2.5">
          <p className={typeEyebrow}>The primitives</p>
          <p className="text-[15px] font-medium">Yours to reshape.</p>
          <p className="text-muted-foreground max-w-[36ch] text-[14px] leading-relaxed">
            Every part is a component you compose. The CLI copies the UI source
            into your repo, and you style it like the rest of your app.
          </p>
        </div>
        <div className="min-w-0">
          <PrimitivesAnatomy />
        </div>
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
