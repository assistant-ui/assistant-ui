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
  };
}

const USER_MESSAGE_TOP_PADDING = 16;
const BASE_SPACER_MIN_HEIGHT = 8;

export const useThreadViewportAutoScroll = <TElement extends HTMLElement>({
  autoScroll = true,
}: useThreadViewportAutoScroll.Options): RefCallback<TElement> => {
  const divRef = useRef<TElement>(null);

  const threadViewportStore = useThreadViewportStore();

  const lastScrollTop = useRef<number>(0);

  // bug: when ScrollToBottom's button changes its disabled state, the scroll stops
  // fix: delay the state change until the scroll is done
  const isScrollingToBottomRef = useRef(false);
  const baseSpacerMinHeightRef = useRef<number | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const div = divRef.current;
    if (!div) return;

    isScrollingToBottomRef.current = true;
    div.scrollTo({ top: div.scrollHeight, behavior });
  }, []);

  const updateSpacerForAnchor = useCallback(
    (element: HTMLElement, shrinkOnly: boolean = false) => {
      const div = divRef.current;
      if (!div) return;

      const spacer = div.querySelector<HTMLElement>(
        ".aui-thread-viewport-spacer",
      );
      if (!spacer) return;

      const scrollHeight = div.scrollHeight;
      const clientHeight = div.clientHeight;

      const elementRect = element.getBoundingClientRect();
      const divRect = div.getBoundingClientRect();
      const anchorTop = elementRect.top - divRect.top + div.scrollTop;

      const requiredSlack = Math.max(
        0,
        clientHeight - USER_MESSAGE_TOP_PADDING,
      );

      const currentSlack = scrollHeight - anchorTop;
      const extraNeeded = requiredSlack - currentSlack;

      const style = getComputedStyle(spacer);
      const currentMin = parseFloat(style.minHeight) || 0;

      if (baseSpacerMinHeightRef.current == null) {
        baseSpacerMinHeightRef.current = Math.max(
          BASE_SPACER_MIN_HEIGHT,
          currentMin,
        );
      }
      const baseMin = baseSpacerMinHeightRef.current ?? BASE_SPACER_MIN_HEIGHT;

      if (extraNeeded > 1) {
        if (shrinkOnly) {
          // During streaming, don't grow - content fluctuations (like markdown rendering) cause temporary shrinks
          return;
        }
        const nextMin = currentMin + extraNeeded;
        console.log("[spacer] GROW", currentMin.toFixed(0), "→", nextMin.toFixed(0));
        spacer.style.minHeight = `${nextMin}px`;
        return;
      }

      if (extraNeeded < -1) {
        const nextMin = Math.max(baseMin, currentMin + extraNeeded);
        if (nextMin < currentMin - 0.5) {
          console.log("[spacer] SHRINK", currentMin.toFixed(0), "→", nextMin.toFixed(0));
          spacer.style.minHeight = `${nextMin}px`;
        } else {
          console.log("[spacer] at min", currentMin.toFixed(0), `(baseMin: ${baseMin})`);
        }
      } else {
        console.log("[spacer] no-op", `extra: ${extraNeeded.toFixed(0)}, current: ${currentMin.toFixed(0)}, slack: ${currentSlack.toFixed(0)}/${requiredSlack.toFixed(0)}`);
      }
    },
    [],
  );

  const scrollToUserMessage = useCallback(
    (element: HTMLElement, behavior: ScrollBehavior = "instant") => {
      const div = divRef.current;
      if (!div || !element) return;

      isScrollingToBottomRef.current = false;

      // Ensure the spacer provides just enough slack for this anchor.
      updateSpacerForAnchor(element);

      // Compute the desired scrollTop so the user message sits near the top.
      const elementRect = element.getBoundingClientRect();
      const divRect = div.getBoundingClientRect();
      const elementTopRelativeToDiv =
        elementRect.top - divRect.top + div.scrollTop;

      let targetScrollTop = elementTopRelativeToDiv - USER_MESSAGE_TOP_PADDING;

      // Clamp to the scrollable range of the container.
      const maxScrollTop = div.scrollHeight - div.clientHeight;
      if (maxScrollTop > 0) {
        targetScrollTop = Math.min(Math.max(0, targetScrollTop), maxScrollTop);
      } else {
        targetScrollTop = 0;
      }

      // Update lastScrollTop before programmatic scroll to prevent false "user scroll" detection
      lastScrollTop.current = targetScrollTop;

      if (behavior === "instant") {
        div.scrollTop = targetScrollTop;
      } else {
        div.scrollTo({ top: targetScrollTop, behavior });
      }

      console.log("[anchor] scrollTop:", targetScrollTop.toFixed(0),
        "anchorTop:", elementTopRelativeToDiv.toFixed(0),
        "scrollHeight:", div.scrollHeight,
        "clientHeight:", div.clientHeight);
      writableStore(threadViewportStore).setState({
        isInReadingPosition: true,
      });
    },
    [threadViewportStore, updateSpacerForAnchor],
  );

  const handleScroll = useCallback(
    (event?: Event) => {
      const div = divRef.current;
      if (!div) return;

      const state = threadViewportStore.getState();
      const prevIsAtBottom = state.isAtBottom;

      const userInitiatedScroll = Boolean(event?.isTrusted);

      // Check if at absolute bottom
      const rawIsAtBottom =
        Math.abs(div.scrollHeight - div.scrollTop - div.clientHeight) < 1 ||
        div.scrollHeight <= div.clientHeight;

      const newIsAtBottom = rawIsAtBottom;
      let newIsInReadingPosition = state.isInReadingPosition;

      // Any meaningful user scroll exits "reading position"
      if (
        userInitiatedScroll &&
        Math.abs(div.scrollTop - lastScrollTop.current) > 1
      ) {
        console.log("[scroll] Exit reading position - delta:", Math.abs(div.scrollTop - lastScrollTop.current).toFixed(0), "isTrusted:", event?.isTrusted);
        newIsInReadingPosition = false;
      }

      if (!rawIsAtBottom && lastScrollTop.current < div.scrollTop) {
        // ignore scroll down for isAtBottom transitions
      } else {
        if (newIsAtBottom) {
          isScrollingToBottomRef.current = false;
        }

        const stateUpdates: Partial<{
          isAtBottom: boolean;
          isInReadingPosition: boolean;
        }> = {};

        if (newIsAtBottom !== prevIsAtBottom) {
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
    },
    [threadViewportStore],
  );

  const resizeRef = useOnResizeContent(() => {
    const div = divRef.current;
    if (!div) return;

    const state = threadViewportStore.getState();

    if (state.isInReadingPosition) {
      const userMessages = div.querySelectorAll<HTMLElement>(
        '[data-aui-message-role="user"]',
      );
      const lastUserMessage = userMessages[userMessages.length - 1];
      if (lastUserMessage) {
        const rect = lastUserMessage.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const visualTop = rect.top - divRect.top;

        updateSpacerForAnchor(lastUserMessage, true); // shrinkOnly during streaming

        // Correct scroll position if anchor has drifted from expected 16px
        const drift = visualTop - USER_MESSAGE_TOP_PADDING;
        if (Math.abs(drift) > 2) {
          const correctedScrollTop = div.scrollTop + drift;
          lastScrollTop.current = correctedScrollTop;
          div.scrollTop = correctedScrollTop;
          console.log("[drift-fix] corrected by:", drift.toFixed(0));
        }
      }
    }

    if (
      autoScroll &&
      !state.isInReadingPosition &&
      (isScrollingToBottomRef.current || state.isAtBottom)
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

  // Handle composer.send event by anchoring to the latest user message
  useAssistantEvent("composer.send", () => {
    if (!autoScroll) return;

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

  const autoScrollRef = useComposedRefs<TElement>(resizeRef, scrollRef, divRef);
  return autoScrollRef as RefCallback<TElement>;
};
