"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  InnerLine,
  Pre,
  type AnnotationHandler,
  type HighlightedCode,
} from "codehike/code";
import { ChevronLeftIcon, ChevronRightIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { changedLineAnnotations } from "./changed-lines";
import { collapse, CollapseSettledContext } from "./collapse";
import { tokenTransitions } from "./token-transitions";

export type CodeSlideshowClientStep = {
  title: string;
  filename: string;
  code: HighlightedCode;
  cut?: boolean | undefined;
};

const mark: AnnotationHandler = {
  name: "mark",
  Line: ({ annotation, ...props }) => (
    <InnerLine
      merge={props}
      data-line=""
      data-changed={annotation ? "" : undefined}
      className={cn(
        "block border-l-2 px-4",
        annotation
          ? "border-l-fd-primary/60 bg-fd-primary/10"
          : "border-l-transparent",
      )}
    />
  ),
};

const tooltip: AnnotationHandler = {
  name: "tooltip",
  Inline: ({ annotation, children }) => {
    const id = useId();
    return (
      <span
        tabIndex={0}
        aria-describedby={id}
        className="group/tooltip ch-tooltip border-fd-muted-foreground/60 relative cursor-help border-b border-dashed"
      >
        {children}
        <span
          id={id}
          role="tooltip"
          className="border-fd-border bg-fd-popover text-fd-popover-foreground absolute bottom-full left-0 z-10 mb-1.5 hidden rounded-md border px-2.5 py-1.5 font-mono text-xs whitespace-nowrap shadow-md group-hover/tooltip:block group-focus-visible/tooltip:block"
        >
          {annotation.query}
        </span>
      </span>
    );
  },
};

const TouchTarget = () => (
  <span
    className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
    aria-hidden="true"
  />
);

export const CodeSlideshowClient = ({
  steps,
  testId,
}: {
  steps: CodeSlideshowClientStep[];
  testId?: string | undefined;
}) => {
  const [nav, setNav] = useState({ index: 0, prevIndex: -1, epoch: 0 });
  const step = steps[nav.index]!;
  const isFirst = nav.index === 0;
  const isLast = nav.index === steps.length - 1;

  const crossesCut = (from: number, to: number) =>
    steps
      .slice(Math.min(from, to) + 1, Math.max(from, to) + 1)
      .some((item) => item.cut);

  const goTo = (index: number) =>
    setNav((current) =>
      index === current.index
        ? current
        : {
            index,
            prevIndex: current.index,
            epoch: current.epoch + (crossesCut(current.index, index) ? 1 : 0),
          },
    );

  const hardCut = nav.prevIndex >= 0 && crossesCut(nav.prevIndex, nav.index);
  const isNewFile =
    nav.prevIndex >= 0 && steps[nav.prevIndex]!.filename !== step.filename;

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const changed = container.querySelectorAll("[data-changed]");
    if (!changed.length) {
      container.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    const first = changed[0]!.getBoundingClientRect();
    const last = changed[changed.length - 1]!.getBoundingClientRect();
    const view = container.getBoundingClientRect();
    const padding = 24;

    let delta = 0;
    if (last.bottom - first.top > view.height)
      delta = first.top - view.top - padding;
    else if (last.bottom > view.bottom)
      delta = last.bottom - view.bottom + padding;
    else if (first.top < view.top) delta = first.top - view.top - padding;
    if (!delta) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    container.scrollTo({
      top: container.scrollTop + delta,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [nav]);

  const annotations = useMemo(
    () =>
      nav.prevIndex < 0 || hardCut
        ? []
        : changedLineAnnotations(
            steps[nav.prevIndex]!.code.code,
            steps[nav.index]!.code.code,
          ),
    [steps, nav, hardCut],
  );

  const dimmed =
    annotations.length > 0 ||
    step.code.annotations.some((annotation) => annotation.name === "mark");

  const collapseSettled =
    nav.prevIndex < 0 ||
    hardCut ||
    isNewFile ||
    steps[nav.prevIndex]!.code.annotations.some(
      (annotation) =>
        annotation.name === "collapse" && annotation.query === "collapsed",
    );

  return (
    <div
      className="not-prose code-slideshow @container my-6"
      data-testid={testId}
    >
      <div className="border-fd-border bg-fd-card overflow-hidden rounded-xl border">
        <div className="border-fd-border/70 flex gap-1 border-b p-3">
          {steps.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Step ${index + 1}: ${item.title}`}
              aria-current={index === nav.index ? "step" : undefined}
              className="group min-w-0 flex-1 cursor-pointer py-1.5"
            >
              <div
                className={cn(
                  "h-1 rounded-full transition-colors",
                  index <= nav.index
                    ? "bg-fd-primary"
                    : "bg-fd-muted group-hover:bg-fd-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>

        <div className="border-fd-border/70 bg-fd-muted/20 min-w-0 border-b">
          <div className="border-fd-border/70 flex items-center gap-3 border-b px-4 py-2.5">
            <div className="flex gap-1.5" aria-hidden="true">
              <div className="bg-fd-muted-foreground/25 size-2.5 rounded-full" />
              <div className="bg-fd-muted-foreground/25 size-2.5 rounded-full" />
              <div className="bg-fd-muted-foreground/25 size-2.5 rounded-full" />
            </div>
            <p className="text-fd-muted-foreground min-w-0 truncate font-mono text-sm">
              {step.filename}
            </p>
          </div>
          <div
            ref={scrollRef}
            tabIndex={0}
            role="region"
            aria-label={step.filename}
            data-dimmed={dimmed ? "" : undefined}
            className="not-fumadocs-codeblock h-96 overflow-auto text-[0.8125rem]"
          >
            <CollapseSettledContext.Provider value={collapseSettled}>
              <Pre
                key={nav.epoch}
                code={{
                  ...step.code,
                  annotations: [...step.code.annotations, ...annotations],
                }}
                handlers={[tokenTransitions, mark, tooltip, ...collapse]}
                className="m-0 min-w-max bg-transparent! py-4"
              />
            </CollapseSettledContext.Provider>
          </div>
        </div>

        <div
          className="flex min-w-0 flex-col gap-6 p-5 @2xl:flex-row @2xl:items-end @2xl:justify-between @2xl:gap-10 @2xl:p-6"
          aria-live="polite"
        >
          <div className="flex max-w-2xl min-w-0 flex-col gap-1">
            <p className="text-fd-muted-foreground text-sm font-medium tabular-nums">
              Step {nav.index + 1} of {steps.length}
            </p>
            <h3 className="text-xl font-semibold text-balance">{step.title}</h3>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-2 @2xl:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goTo(Math.max(0, nav.index - 1))}
              disabled={isFirst}
              className="text-fd-muted-foreground hover:text-fd-foreground relative"
            >
              <TouchTarget />
              <ChevronLeftIcon />
              Back
            </Button>
            <Button
              size="sm"
              onClick={() => goTo(isLast ? 0 : nav.index + 1)}
              className="relative"
            >
              <TouchTarget />
              {isLast ? (
                <>
                  <RotateCcwIcon />
                  Start over
                </>
              ) : (
                <>
                  Next
                  <ChevronRightIcon />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
