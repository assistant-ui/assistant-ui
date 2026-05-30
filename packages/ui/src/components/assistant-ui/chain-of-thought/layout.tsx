"use client";

import { Children, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CONTAINER_ENTER_ANIM, CONTAINER_EXIT_ANIM } from "./styles";
import { JumpToLatestButton, useAutoScroll } from "./scroll";
import { useChainOfThoughtStrings } from "./strings";

/** Props for a scrollable free-form reasoning text container. */
export type ChainOfThoughtTextProps = React.ComponentProps<"div"> & {
  autoScroll?: boolean | undefined;
  showCursor?: boolean | undefined;
};

/** Scrollable text body for custom ChainOfThought compositions. */
export function ChainOfThoughtText({
  className,
  autoScroll = false,
  showCursor = false,
  children,
  ...props
}: ChainOfThoughtTextProps) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const setScrollRef = useCallback((el: HTMLDivElement | null) => {
    setScrollEl((current) => (current === el ? current : el));
  }, []);
  const { isScrolledUp, scrollToBottom } = useAutoScroll(scrollEl, children, {
    autoPin: autoScroll,
  });

  const [cursorMounted, setCursorMounted] = useState(showCursor);

  useEffect(() => {
    if (showCursor) {
      setCursorMounted(true);
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCursorMounted(false);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [showCursor]);

  return (
    <div className="aui-chain-of-thought-text-wrapper relative">
      <div
        ref={setScrollRef}
        data-slot="chain-of-thought-text"
        className={cn(
          "aui-chain-of-thought-text",
          "relative z-0 max-h-64 overflow-y-auto overflow-x-hidden pt-2 pb-2 pl-9 leading-relaxed",
          "break-words [overflow-wrap:anywhere]",
          "transform-gpu",
          CONTAINER_ENTER_ANIM,
          CONTAINER_EXIT_ANIM,
          className,
        )}
        {...props}
      >
        {children}
        {cursorMounted && (
          <span
            aria-hidden
            className={cn(
              "aui-chain-of-thought-cursor ml-1 inline-block size-2 rounded-full bg-foreground/70 align-middle",
              "transition-opacity duration-300 ease-out",
              "motion-reduce:animate-none motion-reduce:transition-none",
              showCursor ? "animate-pulse opacity-100" : "opacity-0",
            )}
          />
        )}
      </div>
      {autoScroll && (
        <JumpToLatestButton onClick={scrollToBottom} visible={isScrolledUp} />
      )}
    </div>
  );
}

/** Empty-state body used when the current chain contains no visible parts. */
export function ChainOfThoughtPlaceholder({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const strings = useChainOfThoughtStrings();
  return (
    <div
      data-slot="chain-of-thought-placeholder"
      className={cn(
        "aui-chain-of-thought-placeholder",
        "py-2 pl-9 text-muted-foreground italic",
        className,
      )}
      {...props}
    >
      {children ?? strings.reasoningHidden}
    </div>
  );
}

/** Props for the vertical ChainOfThought timeline primitive. */
export type ChainOfThoughtTimelineProps = React.ComponentProps<"ul"> & {
  autoScroll?: boolean | undefined;
  /**
   * Primitive key that changes when new content should trigger an auto-scroll.
   * Provide a stable value (e.g. a part count). When omitted it falls back to
   * `Children.count(children)` so the pin fires when children are added/removed
   * rather than on every parent render (pass `autoScrollKey` for finer control).
   */
  autoScrollKey?: unknown;
  autoScrollBehavior?: ScrollBehavior | undefined;
  constrainHeight?: boolean | undefined;
};

/** Vertical list that handles constrained height and auto-scroll behavior. */
export function ChainOfThoughtTimeline({
  className,
  autoScroll = true,
  autoScrollKey,
  autoScrollBehavior = "auto",
  constrainHeight = false,
  children,
  ...props
}: ChainOfThoughtTimelineProps) {
  const [scrollEl, setScrollEl] = useState<HTMLUListElement | null>(null);
  // Auto-pin only while streaming, but keep tracking scroll position (so the
  // jump affordance survives) whenever the panel is height-constrained.
  const trackScroll = autoScroll || constrainHeight;
  const { isScrolledUp, scrollToBottom } = useAutoScroll(
    scrollEl,
    autoScrollKey ?? Children.count(children),
    {
      autoPin: autoScroll,
      track: trackScroll,
      behavior: autoScrollBehavior,
    },
  );

  const setScrollRef = useCallback((el: HTMLUListElement | null) => {
    setScrollEl((current) => (current === el ? current : el));
  }, []);

  const { style: listStyle, ...listProps } = props;

  const listClassName = cn(
    "aui-chain-of-thought-timeline",
    "relative z-0",
    "flex flex-col",
    "transform-gpu",
    CONTAINER_ENTER_ANIM,
    CONTAINER_EXIT_ANIM,
    "motion-reduce:![animation:none] motion-reduce:![transition:none]",
    constrainHeight
      ? "max-h-64 overflow-y-auto overflow-x-hidden"
      : "overflow-visible",
    className,
  );

  return (
    <div className="aui-chain-of-thought-timeline-wrapper motion-reduce:![animation:none] motion-reduce:![transition:none] relative">
      {/* Explicit role survives Tailwind Preflight's `list-style:none`, which
          otherwise makes WebKit/VoiceOver drop the implicit list semantics. */}
      <ul
        ref={setScrollRef}
        data-slot="chain-of-thought-timeline"
        role="list"
        className={listClassName}
        style={listStyle}
        {...listProps}
      >
        {children}
      </ul>
      {trackScroll && (
        <JumpToLatestButton onClick={scrollToBottom} visible={isScrolledUp} />
      )}
    </div>
  );
}
