"use client";

import { useAssistantState } from "../../context";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { getLastUserMessageId } from "./utils/getLastUserMessageId";

/**
 * The threshold where we consider a user message "too tall" to show the entire message
 * when scrolling to it. Instead, just show the last couple lines of the message and
 * cut off the rest.
 *
 * The value approximately corresponds to a couple lines of text + padding.
 */
const TALL_USER_MESSAGE_THRESHOLD = 80;

export const useScrollToLastUserMessage = (
  viewportRef: RefObject<HTMLElement | null>,
  autoScroll: boolean,
) => {
  const lastUserMessageAnchorRef = useRef<HTMLElement | null>(null);
  const pendingScrollRef = useRef(false);
  const warnedMissingAnchorRef = useRef(false);
  const threadViewportStore = useThreadViewportStore();

  const scrollToLastUserMessage = useCallback(() => {
    const viewportEl = viewportRef.current;
    const anchorEl = lastUserMessageAnchorRef.current;
    if (!viewportEl || !anchorEl) return false;

    /**
     * LastUserMessageAnchor is always rendered after the last UserMessage, so
     * we can easily access and measure it.
     */
    const userMessageEl =
      (anchorEl.previousElementSibling as HTMLElement | null) ?? anchorEl;

    const viewportRect = viewportEl.getBoundingClientRect();
    const targetRect = userMessageEl.getBoundingClientRect();
    let offsetTop = targetRect.top - viewportRect.top + viewportEl.scrollTop;

    if (targetRect.height > TALL_USER_MESSAGE_THRESHOLD) {
      offsetTop += targetRect.height - TALL_USER_MESSAGE_THRESHOLD;
    }

    viewportEl.scrollTo({
      top: offsetTop,
    });

    return true;
  }, [viewportRef]);

  const registerLastUserMessageAnchor = useCallback(
    (node: HTMLElement | null) => {
      lastUserMessageAnchorRef.current = node;
      if (!node) return;

      warnedMissingAnchorRef.current = false;
      if (pendingScrollRef.current && scrollToLastUserMessage()) {
        pendingScrollRef.current = false;
      }
    },
    [scrollToLastUserMessage],
  );

  const threadState = useAssistantState(({ thread }) => thread);
  const isRunning = threadState.isRunning;
  const messagesLength = threadState.messages.length;
  const lastUserMessageId = getLastUserMessageId(threadState.messages);
  const hasUserMessage = lastUserMessageId !== undefined;
  const previousStateRef = useRef({
    isRunning,
    messagesLength,
    lastUserMessageId,
  });

  useLayoutEffect(() => {
    if (!autoScroll) {
      // Auto-scroll disabled: clear pending state and snapshot current values.
      pendingScrollRef.current = false;
      previousStateRef.current = {
        isRunning,
        messagesLength,
        lastUserMessageId,
      };
      return;
    }

    const previousState = previousStateRef.current;
    const events = {
      messageAdded: messagesLength > previousState.messagesLength,
      userMessageChanged:
        lastUserMessageId !== undefined &&
        lastUserMessageId !== previousState.lastUserMessageId,
      runStarted: isRunning && !previousState.isRunning,
    };

    const shouldAutoScroll =
      events.userMessageChanged ||
      (threadViewportStore.getState().isAtBottom && events.runStarted);
    const shouldHandleScrollEvents =
      events.messageAdded || events.runStarted || events.userMessageChanged;

    // Dev-only warning so consumers know when they've forgotten to render the anchor.
    const warnIfMissingAnchor = () => {
      if (process.env["NODE_ENV"] === "production") return;
      if (!shouldAutoScroll || !pendingScrollRef.current || !hasUserMessage)
        return;
      if (lastUserMessageAnchorRef.current || warnedMissingAnchorRef.current)
        return;

      warnedMissingAnchorRef.current = true;
      console.warn(
        "[assistant-ui] Auto-scroll is enabled but no last user message anchor was registered. Use ThreadPrimitive.Messages, or if you render your own list, render a zero-height anchor after the last user message and attach useRegisterLastUserMessageScrollAnchor to it.",
      );
    };

    if (shouldHandleScrollEvents) {
      pendingScrollRef.current = shouldAutoScroll;
      // Try to scroll now; otherwise leave the pending flag so we can retry when the anchor mounts.
      const scrolled = shouldAutoScroll && scrollToLastUserMessage();
      if (scrolled) {
        pendingScrollRef.current = false;
      } else {
        warnIfMissingAnchor();
      }
    }

    previousStateRef.current = {
      isRunning,
      messagesLength,
      lastUserMessageId,
    };
  }, [
    autoScroll,
    hasUserMessage,
    isRunning,
    lastUserMessageId,
    messagesLength,
    scrollToLastUserMessage,
    threadViewportStore,
  ]);

  return registerLastUserMessageAnchor;
};
