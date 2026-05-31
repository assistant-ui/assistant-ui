"use client";

import { Children, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { CONTAINER_ENTER_ANIM, CONTAINER_EXIT_ANIM } from "./styles";
import { JumpToLatestButton, useAutoScroll } from "./scroll";

export type ChainOfThoughtTimelineProps = React.ComponentProps<"ul"> & {
  autoScroll?: boolean | undefined;
  autoScrollKey?: unknown;
  autoScrollBehavior?: ScrollBehavior | undefined;
  constrainHeight?: boolean | undefined;
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
  // Keep the jump affordance live for constrained, finished panels.
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
      {/* Keep a real list element so timeline steps retain list semantics. */}
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
