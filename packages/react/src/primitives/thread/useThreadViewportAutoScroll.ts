"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { useCallback, useLayoutEffect, useRef, type RefCallback } from "react";
import { useAuiEvent, useAuiState } from "@assistant-ui/store";
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

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    scrollingToBottomBehaviorRef.current = behavior;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const scheduleScrollToBottom = useCallback(
    (behavior: ScrollBehavior) => {
      scrollingToBottomBehaviorRef.current = behavior;
      if (scheduledFrameRef.current !== null) {
        cancelAnimationFrame(scheduledFrameRef.current);
      }
      scheduledFrameRef.current = requestAnimationFrame(() => {
        scheduledFrameRef.current = null;
        scrollToBottom(behavior);
      });
    },
    [scrollToBottom],
  );

  useLayoutEffect(
    () => () => {
      if (scheduledFrameRef.current !== null) {
        cancelAnimationFrame(scheduledFrameRef.current);
      }
    },
    [],
  );

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
    const newIsAtBottom =
      Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) <= 1 ||
      div.scrollHeight <= div.clientHeight;

    const isInFlightDownwardScroll =
      !newIsAtBottom && lastScrollTop.current < div.scrollTop;
    if (isInFlightDownwardScroll) {
      // no-op: a smooth scroll-to-bottom fires many midpoint scroll events
      // before landing, don't flicker isAtBottom or clear intent mid-animation
    } else {
      if (newIsAtBottom) {
        // newIsAtBottom is ambiguous when the viewport doesn't overflow —
        // keep intent alive until content can actually scroll
        const viewportOverflows = div.scrollHeight > div.clientHeight + 1;
        if (viewportOverflows) {
          scrollingToBottomBehaviorRef.current = null;
        }
      } else if (
        lastScrollTop.current > div.scrollTop &&
        lastScrollHeight.current === div.scrollHeight
      ) {
        // scrollHeight equality rules out content-driven shifts being misread as user scroll-up
        scrollingToBottomBehaviorRef.current = null;
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
    } else if (autoScroll && threadViewportStore.getState().isAtBottom) {
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

  useAuiEvent("threadListItem.switchedTo", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    scheduleScrollToBottom("instant");
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
