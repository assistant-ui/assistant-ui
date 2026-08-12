"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  InnerLine,
  Pre,
  type AnnotationHandler,
  type HighlightedCode,
} from "codehike/code";
import { cn } from "@/lib/utils";
import { changedLineAnnotations } from "./changed-lines";
import { collapse, CollapseSettledContext } from "./collapse";
import { tokenTransitions } from "./token-transitions";
import { useAutoScrollToChanges } from "./use-auto-scroll";

export type CodePaneStep = {
  filename: string;
  code: HighlightedCode;
  /** Hard-cut into this step instead of animating from the previous one. */
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

/**
 * Animated code pane that morphs between highlighted steps with token
 * transitions, changed-line marks, and auto-scroll to the changed region.
 * Must live inside a `.code-slideshow` wrapper for the codehike.css animations.
 */
export const CodePane = ({
  steps,
  index,
  className,
}: {
  steps: CodePaneStep[];
  index: number;
  className?: string;
}) => {
  const [nav, setNav] = useState({ index, prevIndex: -1, epoch: 0 });

  const crossesCut = (from: number, to: number) =>
    steps
      .slice(Math.min(from, to) + 1, Math.max(from, to) + 1)
      .some((item) => item.cut);

  if (nav.index !== index) {
    setNav({
      index,
      prevIndex: nav.index,
      epoch: nav.epoch + (crossesCut(nav.index, index) ? 1 : 0),
    });
  }

  const step = steps[nav.index]!;
  const hardCut = nav.prevIndex >= 0 && crossesCut(nav.prevIndex, nav.index);
  const isNewFile =
    nav.prevIndex >= 0 && steps[nav.prevIndex]!.filename !== step.filename;

  const scrollRef = useRef<HTMLDivElement>(null);
  useAutoScrollToChanges(scrollRef, nav);

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
    <div className={cn("bg-fd-muted/20 flex min-w-0 flex-col", className)}>
      <div className="border-fd-border/70 flex shrink-0 items-center gap-3 border-b px-4 py-2.5">
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
        className="not-fumadocs-codeblock min-h-0 flex-1 overflow-auto text-[0.8125rem]"
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
  );
};
