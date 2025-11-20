"use client";

import { useAssistantState } from "../../context";
import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

const TALL_USER_MESSAGE_THRESHOLD = 80;

export const useScrollToLastUserMessage = (
  viewportRef: RefObject<HTMLElement | null>,
  autoScroll: boolean,
) => {
  const lastUserMessageAnchorRef = useRef<HTMLElement | null>(null);
  const pendingScrollRef = useRef(false);

  const scrollToLastUserMessage = useCallback(() => {
    const viewport = viewportRef.current;
    const anchor = lastUserMessageAnchorRef.current;
    if (!viewport || !anchor) return false;

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

    previousStateRef.current = { isRunning, messagesLength };
  }, [autoScroll, isRunning, messagesLength, scrollToLastUserMessage]);

  return registerLastUserMessageAnchor;
};
