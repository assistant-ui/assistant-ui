"use client";

import { useAssistantState } from "../../context";
import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

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
  const hasUserMessage = (() => {
    for (let i = threadState.messages.length - 1; i >= 0; i -= 1) {
      if (threadState.messages[i]?.role === "user") return true;
    }
    return false;
  })();

  const previousStateRef = useRef({
    isRunning,
    messagesLength,
  });

  useLayoutEffect(() => {
    if (!autoScroll) {
      previousStateRef.current = { isRunning, messagesLength };
      pendingScrollRef.current = false;
      return;
    }

    const { isRunning: prevIsRunning, messagesLength: prevMessagesLength } =
      previousStateRef.current;

    const messageAdded = messagesLength > prevMessagesLength;
    const runStarted = isRunning && !prevIsRunning;

    if (messageAdded || runStarted) {
      pendingScrollRef.current = true;
      if (scrollToLastUserMessage()) {
        pendingScrollRef.current = false;
      }
    }

    if (
      process.env["NODE_ENV"] !== "production" &&
      autoScroll &&
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

    previousStateRef.current = { isRunning, messagesLength };
  }, [
    autoScroll,
    hasUserMessage,
    isRunning,
    messagesLength,
    scrollToLastUserMessage,
  ]);

  return registerLastUserMessageAnchor;
};
