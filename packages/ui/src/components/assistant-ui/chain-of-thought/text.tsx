"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { CONTAINER_ENTER_ANIM, CONTAINER_EXIT_ANIM } from "./styles";
import { JumpToLatestButton, useAutoScroll } from "./scroll";

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

  const [cursorMounted, setCursorMounted] = useState(() => showCursor);

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
