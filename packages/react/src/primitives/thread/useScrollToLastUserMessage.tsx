"use client";

import { useAssistantState } from "../../context";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";
import { getLastUserMessageId } from "./utils/getLastUserMessageId";

/**
 * The threshold for considering a user message "too tall" to scroll the entire message
 * into view. Just show the last couple lines of the message and cut off the rest.
 * The value approximately corresponds to a couple lines of text + padding.
 */
const TALL_USER_MESSAGE_THRESHOLD = 100;

export const useScrollToLastUserMessage = (
  viewportRef: RefObject<HTMLElement | null>,
  autoScroll: boolean,
) => {
  const lastUserMessageAnchorRef = useRef<HTMLElement | null>(null);
  const pendingScrollRef = useRef(false);
  const warnedMissingAnchorRef = useRef(false);
  const threadViewportStore = useThreadViewportStore();

  const scrollToLastUserMessage = useCallback(() => {
    const viewport = viewportRef.current;
    const anchor = lastUserMessageAnchorRef.current;
    if (!viewport || !anchor) return false;

    /**
     * LastUserMessageAnchor is rendered after the message, so we need to access
     * the previous element sibling (the message element) for measurement
     */
    const messageElement =
      (anchor.previousElementSibling as HTMLElement | null) ?? anchor;

    const viewportRect = viewport.getBoundingClientRect();
    const targetRect = messageElement.getBoundingClientRect();
    let offsetTop = targetRect.top - viewportRect.top + viewport.scrollTop;

    if (targetRect.height > TALL_USER_MESSAGE_THRESHOLD) {
      offsetTop += targetRect.height - TALL_USER_MESSAGE_THRESHOLD;
    }

    viewport.scrollTo({
      top: offsetTop,
      behavior: "auto",
    });

    return true;
  }, [viewportRef]);

  const registerLastUserMessageAnchor = useCallback(
    (node: HTMLElement | null) => {
      lastUserMessageAnchorRef.current = node;
      if (node) {
        warnedMissingAnchorRef.current = false;
      }
      if (node && pendingScrollRef.current) {
        if (scrollToLastUserMessage()) {
          pendingScrollRef.current = false;
        }
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
      previousStateRef.current = {
        isRunning,
        messagesLength,
        lastUserMessageId,
      };
      pendingScrollRef.current = false;
      return;
    }

    const {
      isRunning: prevIsRunning,
      messagesLength: prevMessagesLength,
      lastUserMessageId: prevLastUserMessageId,
    } = previousStateRef.current;

    const messageAdded = messagesLength > prevMessagesLength;
    const userMessageChanged =
      lastUserMessageId !== undefined &&
      lastUserMessageId !== prevLastUserMessageId;
    const runStarted = isRunning && !prevIsRunning;
    const shouldAutoScroll =
      autoScroll &&
      (userMessageChanged ||
        (threadViewportStore.getState().isAtBottom && runStarted));

    if (messageAdded || runStarted || userMessageChanged) {
      pendingScrollRef.current = shouldAutoScroll;
      if (shouldAutoScroll && scrollToLastUserMessage()) {
        pendingScrollRef.current = false;
      }
    }

    if (
      process.env["NODE_ENV"] !== "production" &&
      shouldAutoScroll &&
      pendingScrollRef.current &&
      hasUserMessage &&
      !lastUserMessageAnchorRef.current &&
      !warnedMissingAnchorRef.current
    ) {
      warnedMissingAnchorRef.current = true;
      console.warn(
        "[assistant-ui] Auto-scroll is enabled but no last user message anchor was registered. Use ThreadPrimitive.Messages, or if you render your own list, render a zero-height anchor after the last user message and attach useRegisterLastUserMessageScrollAnchor to it.",
      );
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
    threadViewportStore,
    scrollToLastUserMessage,
  ]);

  return registerLastUserMessageAnchor;
};
