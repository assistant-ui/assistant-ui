"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CONTAINER_ENTER_ANIM, CONTAINER_EXIT_ANIM } from "./styles";
import { JumpToLatestButton, useAutoScroll } from "./scroll";

export type ChainOfThoughtTextProps = React.ComponentProps<"div"> & {
  autoScroll?: boolean;
  showCursor?: boolean;
};

export function ChainOfThoughtText({
  className,
  autoScroll = false,
  showCursor = false,
  children,
  ...props
}: ChainOfThoughtTextProps) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const { isScrolledUp, scrollToBottom } = useAutoScroll(
    scrollEl,
    children,
    autoScroll,
  );

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
        ref={(el) => setScrollEl(el)}
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

export function ChainOfThoughtPlaceholder({
  className,
  children = "Reasoning hidden.",
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chain-of-thought-placeholder"
      className={cn(
        "aui-chain-of-thought-placeholder",
        "py-2 pl-9 text-muted-foreground/70 italic",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type ChainOfThoughtTimelineProps = React.ComponentProps<"ul"> & {
  autoScroll?: boolean;
  autoScrollKey?: unknown;
  autoScrollBehavior?: ScrollBehavior;
  constrainHeight?: boolean;
};

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
  const { isScrolledUp, scrollToBottom } = useAutoScroll(
    scrollEl,
    autoScrollKey ?? children,
    autoScroll,
    autoScrollBehavior,
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
      <ul
        ref={setScrollRef}
        data-slot="chain-of-thought-timeline"
        className={listClassName}
        style={listStyle}
        {...listProps}
      >
        {children}
      </ul>
      {autoScroll && (
        <JumpToLatestButton onClick={scrollToBottom} visible={isScrolledUp} />
      )}
    </div>
  );
}
