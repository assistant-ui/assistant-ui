"use client";

import { Children, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { CONTAINER_ENTER_ANIM, CONTAINER_EXIT_ANIM } from "./styles";
import { JumpToLatestButton, useAutoScroll } from "./scroll";

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
