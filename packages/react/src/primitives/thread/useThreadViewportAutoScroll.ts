"use client";

import { useComposedRefs } from "radix-ui/internal";
import { useCallback, useLayoutEffect, useRef, type RefCallback } from "react";
import { useAuiEvent, useAuiState } from "@assistant-ui/store";
import {
  isUserScrollUp,
  isViewportAtBottom,
  viewportOverflows,
} from "@assistant-ui/store/client";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { writableStore } from "../../context/ReadonlyStore";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";

export namespace useThreadViewportAutoScroll {
  export type Options = {
    /**
     * Whether to automatically scroll to the bottom when new messages are added.
     * When enabled, the viewport will automatically scroll to show the latest content.
     *
     * Default false if `turnAnchor` is "top", otherwise defaults to true.
     */
    autoScroll?: boolean | undefined;

    /**
     * Whether to scroll to bottom when a new run starts.
     *
     * Defaults to true.
     */
    scrollToBottomOnRunStart?: boolean | undefined;

    /**
     * Whether to scroll to bottom when messages first appear in the thread.
     *
     * Defaults to true.
     */
    scrollToBottomOnInitialize?: boolean | undefined;

    /**
     * Whether to scroll to bottom when switching to a different thread.
     *
     * Defaults to true.
     */
    scrollToBottomOnThreadSwitch?: boolean | undefined;
  };
}

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll,
  scrollToBottomOnRunStart = true,
  scrollToBottomOnInitialize = true,
  scrollToBottomOnThreadSwitch = true,
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);
  const hasMessages = useAuiState((s) => s.thread.messages.length > 0);
  const isRunning = useAuiState((s) => s.thread.isRunning);
  const initializeScrollRequestedRef = useRef(false);
  const scheduledFrameRef = useRef<number | null>(null);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== "top";
  }

  const lastScrollTop = useRef<number>(0);
  const lastScrollHeight = useRef<number>(0);
  const lastObservedScrollHeight = useRef<number>(0);
  const lastObservedClientHeight = useRef<number>(0);

  // Pending bottom-scroll intent. Planted by initialize/run-start/switch/button
  // triggers, cleared when handleScroll confirms we reached bottom, or when the
  // user actively scrolls up while content size is stable.
  const scrollingToBottomBehaviorRef = useRef<ScrollBehavior | null>(null);
  const followBottomRef = useRef(autoScroll);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    followBottomRef.current = true;
    scrollingToBottomBehaviorRef.current = behavior;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const cancelScheduledFrame = useCallback(() => {
    if (scheduledFrameRef.current === null) return;
    cancelAnimationFrame(scheduledFrameRef.current);
    scheduledFrameRef.current = null;
  }, []);

  const scheduleScrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      scrollingToBottomBehaviorRef.current = behavior;
      cancelScheduledFrame();
      scheduledFrameRef.current = requestAnimationFrame(() => {
        scheduledFrameRef.current = null;
        scrollToBottom(behavior);
      });
    },
    [cancelScheduledFrame, scrollToBottom],
  );

  useLayoutEffect(() => () => cancelScheduledFrame(), [cancelScheduledFrame]);

  const hasActiveTopAnchor = useCallback(() => {
    const state = threadViewportStore.getState();
    return (
      state.turnAnchor === "top" &&
      state.element.viewport === divRef.current &&
      state.element.anchor !== null
    );
  }, [threadViewportStore]);

  const handleScroll = () => {
    const div = divRef.current;
    if (!div) return;

    const isAtBottom = threadViewportStore.getState().isAtBottom;
    const newIsAtBottom = isViewportAtBottom(div);

    const isInFlightDownwardScroll =
      !newIsAtBottom && lastScrollTop.current < div.scrollTop;
    if (isInFlightDownwardScroll) {
      // no-op: a smooth scroll-to-bottom fires many midpoint scroll events
      // before landing, don't flicker isAtBottom or clear intent mid-animation
    } else {
      const userScrolledUp = isUserScrollUp(
        {
          scrollTop: lastScrollTop.current,
          scrollHeight: lastScrollHeight.current,
        },
        div,
      );

      if (newIsAtBottom) {
        // newIsAtBottom is ambiguous when the viewport doesn't overflow —
        // keep intent alive until content can actually scroll
        if (viewportOverflows(div)) {
          scrollingToBottomBehaviorRef.current = null;
        }
        if (autoScroll) followBottomRef.current = true;
      } else if (userScrolledUp) {
        cancelScheduledFrame();
        scrollingToBottomBehaviorRef.current = null;
        followBottomRef.current = false;
      }

      const shouldUpdate =
        newIsAtBottom || scrollingToBottomBehaviorRef.current === null;

      if (shouldUpdate && newIsAtBottom !== isAtBottom) {
        writableStore(threadViewportStore).setState({
          isAtBottom: newIsAtBottom,
        });
      }
    }

    lastScrollTop.current = div.scrollTop;
    lastScrollHeight.current = div.scrollHeight;
  };

  const resizeRef = useOnResizeContent(() => {
    const div = divRef.current;
    if (!div) return;

    const { scrollHeight, clientHeight } = div;
    if (
      scrollHeight === lastObservedScrollHeight.current &&
      clientHeight === lastObservedClientHeight.current
    ) {
      return;
    }
    lastObservedScrollHeight.current = scrollHeight;
    lastObservedClientHeight.current = clientHeight;

    const scrollBehavior = scrollingToBottomBehaviorRef.current;
    if (scrollBehavior && hasActiveTopAnchor()) {
      // Let the top-anchor reserve own scrolling while a run starts to avoid a bottom-scroll race.
      scrollingToBottomBehaviorRef.current = null;
    } else if (scrollBehavior) {
      scrollToBottom(scrollBehavior);
    } else if (
      autoScroll &&
      !(isRunning && hasActiveTopAnchor()) &&
      followBottomRef.current
    ) {
      scrollToBottom("instant");
    }

    handleScroll();
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    // A pointer gesture invalidates pending bottom-scroll intent; otherwise an
    // intent kept alive by a non-overflowing thread (see handleScroll) hijacks
    // the next content growth, e.g. expanding a collapsible tool call.
    const cancelPendingScrollToBottom = () => {
      scrollingToBottomBehaviorRef.current = null;
    };
    el.addEventListener("scroll", handleScroll);
    el.addEventListener("pointerdown", cancelPendingScrollToBottom);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("pointerdown", cancelPendingScrollToBottom);
    };
  });

  useLayoutEffect(() => {
    if (!scrollToBottomOnInitialize) return;
    if (!hasMessages) {
      initializeScrollRequestedRef.current = false;
      return;
    }
    if (initializeScrollRequestedRef.current) return;

    initializeScrollRequestedRef.current = true;
    // defer to an in-flight run (e.g. first message on a new thread) that
    // already planted intent — otherwise we'd downgrade its "auto" to "instant"
    if (scrollingToBottomBehaviorRef.current !== null) return;
    scheduleScrollToBottom("instant");
  }, [hasMessages, scheduleScrollToBottom, scrollToBottomOnInitialize]);

  useOnScrollToBottom(({ behavior }) => {
    scrollToBottom(behavior);
  });

  useAuiEvent("thread.runStart", () => {
    if (!scrollToBottomOnRunStart) return;
    if (threadViewportStore.getState().turnAnchor === "top") return;
    scheduleScrollToBottom("auto");
  });

  useAuiEvent("threads.selectionChanged", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    scheduleScrollToBottom("instant");
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
