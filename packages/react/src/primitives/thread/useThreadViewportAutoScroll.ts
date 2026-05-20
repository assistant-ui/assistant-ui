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
     * Whether to scroll to bottom when messages first appear in the thread,
     * whether from sync `initialMessages`, an async history adapter, or
     * the first programmatic append.
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
  const messageCount = useAuiState((s) => s.thread.messages.length);
  const initializeScrollRequestedRef = useRef(false);

  const threadViewportStore = useThreadViewportStore();
  if (autoScroll === undefined) {
    autoScroll = threadViewportStore.getState().turnAnchor !== "top";
  }

  const lastScrollTop = useRef<number>(0);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  // stores the scroll behavior to reuse during content resize, or null if not scrolling
  const scrollingToBottomBehaviorRef = useRef<ScrollBehavior | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    scrollingToBottomBehaviorRef.current = behavior;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

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
      Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 1 ||
      div.scrollHeight <= div.clientHeight;

    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
      // ignore scroll down
    } else {
      if (newIsAtBottom) {
        // newIsAtBottom is ambiguous when the viewport doesn't overflow — keep intent alive
        const viewportOverflows = div.scrollHeight > div.clientHeight + 1;
        if (viewportOverflows || scrollingToBottomBehaviorRef.current === null) {
          scrollingToBottomBehaviorRef.current = null;
        }
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
  };

  const resizeRef = useOnResizeContent(() => {
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

  // initialize-scroll when messages first appear
  useLayoutEffect(() => {
    if (!scrollToBottomOnInitialize) return;
    if (messageCount === 0) {
      initializeScrollRequestedRef.current = false;
      return;
    }
    if (initializeScrollRequestedRef.current) return;

    initializeScrollRequestedRef.current = true;
    scrollingToBottomBehaviorRef.current = "instant";
    requestAnimationFrame(() => {
      scrollToBottom("instant");
    });
  }, [messageCount, scrollToBottom, scrollToBottomOnInitialize]);

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  });

  useOnScrollToBottom(({ behavior }) => {
    scrollToBottom(behavior);
  });

  // autoscroll on run start
  useAuiEvent("thread.runStart", () => {
    if (!scrollToBottomOnRunStart) return;
    if (threadViewportStore.getState().turnAnchor === "top") return;

    scrollingToBottomBehaviorRef.current = "auto";
    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  });

  // scroll to bottom instantly when switching threads
  useAuiEvent("threadListItem.switchedTo", () => {
    if (!scrollToBottomOnThreadSwitch) return;
    scrollingToBottomBehaviorRef.current = "instant";
    requestAnimationFrame(() => {
      scrollToBottom("instant");
    });
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
