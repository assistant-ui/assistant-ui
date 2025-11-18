"use client";

import { useComposedRefs } from "@radix-ui/react-compose-refs";
import { RefCallback, useCallback, useEffect, useRef } from "react";
import { useAssistantEvent } from "../../context";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";
import { useManagedRef } from "../../utils/hooks/useManagedRef";
import { writableStore } from "../../context/ReadonlyStore";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";

export namespace useThreadViewportAutoScroll {
  export type Options = {
    autoScroll?: boolean | undefined;
    /**
     * Scroll mode for the viewport.
     * - "bottom": Traditional scroll-to-bottom behavior (default)
     * - "user-message": Scroll to position user message at top when sent
     */
    scrollMode?: "bottom" | "user-message" | undefined;
  };
}

// Padding from top when scrolling user message into view
const USER_MESSAGE_TOP_PADDING = 16;
// Threshold for considering user message "in reading position"
const READING_POSITION_THRESHOLD = 50;

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll = true,
  scrollMode = "bottom",
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);

  const threadViewportStore = useThreadViewportStore();

  const lastScrollTop = useRef<number>(0);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  const isScrollingToBottomRef = useRef(false);
  const isScrollingToUserMessageRef = useRef(false);

  // Track the anchor element and its target visual position for scroll locking
  const anchorElementRef = useRef<HTMLElement | null>(null);
  const lockedOffsetRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    isScrollingToBottomRef.current = true;
    isScrollingToUserMessageRef.current = false;
    anchorElementRef.current = null;
    lockedOffsetRef.current = null;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const scrollToUserMessage = useCallback(
    (element: HTMLElement, behavior: ScrollBehavior = "instant") => {
      const div = divRef.current;
      if (!div || !element) return;

      isScrollingToUserMessageRef.current = true;
      isScrollingToBottomRef.current = false;

      // Calculate target scroll position to put element at top with padding
      const elementRect = element.getBoundingClientRect();
      const divRect = div.getBoundingClientRect();
      const elementTopRelativeToDiv =
        elementRect.top - divRect.top + div.scrollTop;
      const targetScrollTop = Math.max(
        0,
        elementTopRelativeToDiv - USER_MESSAGE_TOP_PADDING,
      );

      // Set up anchor element for scroll locking (all browsers)
      anchorElementRef.current = element;
      // Store the target visual position (distance from viewport top)
      lockedOffsetRef.current = USER_MESSAGE_TOP_PADDING;

      requestAnimationFrame(() => {
        div.scrollTo({ top: targetScrollTop, behavior });

        // Update reading position state
        writableStore(threadViewportStore).setState({
          isInReadingPosition: true,
          isAtBottom: false,
        });
      });
    },
    [threadViewportStore],
  );

  const handleScroll = useCallback(() => {
    const div = divRef.current;
    if (!div) return;

    const state = threadViewportStore.getState();
    const isAtBottom = state.isAtBottom;

    // Check if at absolute bottom
    const newIsAtBottom =
      Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 1 ||
      div.scrollHeight <= div.clientHeight;

    // Check if in reading position (user message near top)
    let newIsInReadingPosition = state.isInReadingPosition;
    if (scrollMode === "user-message" && anchorElementRef.current) {
      const element = anchorElementRef.current;
      const elementRect = element.getBoundingClientRect();
      const divRect = div.getBoundingClientRect();
      const elementTopInViewport = elementRect.top - divRect.top;
      newIsInReadingPosition =
        elementTopInViewport >= 0 &&
        elementTopInViewport <= READING_POSITION_THRESHOLD;
    }

    if (!newIsAtBottom && lastScrollTop.current < div.scrollTop) {
      // ignore scroll down
    } else {
      if (newIsAtBottom) {
        isScrollingToBottomRef.current = false;
        isScrollingToUserMessageRef.current = false;
        anchorElementRef.current = null;
        lockedOffsetRef.current = null;
      }

      const stateUpdates: Partial<{
        isAtBottom: boolean;
        isInReadingPosition: boolean;
      }> = {};

      if (newIsAtBottom !== isAtBottom) {
        stateUpdates.isAtBottom = newIsAtBottom;
      }

      if (newIsInReadingPosition !== state.isInReadingPosition) {
        stateUpdates.isInReadingPosition = newIsInReadingPosition;
      }

      if (Object.keys(stateUpdates).length > 0) {
        writableStore(threadViewportStore).setState(stateUpdates);
      }
    }

    lastScrollTop.current = div.scrollTop;
  }, [threadViewportStore, scrollMode]);

  const resizeRef = useOnResizeContent(() => {
    const div = divRef.current;
    if (!div) return;

    // User-message mode: maintain scroll position to keep anchor element at fixed visual position
    if (
      scrollMode === "user-message" &&
      anchorElementRef.current &&
      lockedOffsetRef.current !== null &&
      isScrollingToUserMessageRef.current
    ) {
      const element = anchorElementRef.current;
      const elementRect = element.getBoundingClientRect();
      const divRect = div.getBoundingClientRect();

      // Current visual position of element relative to viewport top
      const currentVisualPosition = elementRect.top - divRect.top;
      // Target visual position (stored as lockedOffsetRef)
      const targetVisualPosition = lockedOffsetRef.current;

      // Calculate drift from target position
      const drift = currentVisualPosition - targetVisualPosition;

      if (Math.abs(drift) > 1) {
        // Adjust scroll to compensate for drift
        div.scrollTop += drift;
      }

      handleScroll();
      return;
    }

    // Traditional scroll-to-bottom behavior
    if (
      autoScroll &&
      scrollMode === "bottom" &&
      (isScrollingToBottomRef.current ||
        threadViewportStore.getState().isAtBottom)
    ) {
      scrollToBottom("instant");
    }

    // User-message mode: scroll to bottom only if explicitly requested
    if (
      autoScroll &&
      scrollMode === "user-message" &&
      isScrollingToBottomRef.current
    ) {
      scrollToBottom("instant");
    }

    handleScroll();
  });

  const scrollRef = useManagedRef<HTMLElement>((el) => {
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  });

  useOnScrollToBottom(() => {
    scrollToBottom("auto");
  });

  // Listen for scroll-to-user-message requests
  useEffect(() => {
    return threadViewportStore
      .getState()
      .onScrollToUserMessage((element: HTMLElement) => {
        scrollToUserMessage(element, "instant");
      });
  }, [threadViewportStore, scrollToUserMessage]);

  // Handle composer.send event in user-message mode
  useAssistantEvent("composer.send", () => {
    if (!autoScroll || scrollMode !== "user-message") return;

    const div = divRef.current;
    if (!div) return;

    // Find the last user message element
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const userMessages = div.querySelectorAll<HTMLElement>(
        '[data-aui-message-role="user"]',
      );
      const lastUserMessage = userMessages[userMessages.length - 1];

      if (lastUserMessage) {
        scrollToUserMessage(lastUserMessage, "instant");
      }
    });
  });

  // autoscroll on run start (only in bottom mode)
  useAssistantEvent("thread.run-start", () => {
    if (autoScroll && scrollMode === "bottom") {
      scrollToBottom("auto");
    }
  });

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
