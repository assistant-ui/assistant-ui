"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";
import { writableStore } from "../../context/ReadonlyStore";
import { useThreadViewportStore } from "../../context/react/ThreadViewportContext";
import { useOnResizeContent } from "../../utils/hooks/useOnResizeContent";
import { useOnScrollToBottom } from "../../utils/hooks/useOnScrollToBottom";

export const useThreadViewportIsAtBottom = <TElement extends HTMLElement>(
  viewportRef: RefObject<TElement | null>,
) => {
  const threadViewportStore = useThreadViewportStore();
  const lastScrollTopRef = useRef(0);

  const updateIsAtBottom = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const prevIsAtBottom = threadViewportStore.getState().isAtBottom;
    const newIsAtBottom =
      Math.abs(
        viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight,
      ) < 1 || viewport.scrollHeight <= viewport.clientHeight;

    if (!newIsAtBottom && lastScrollTopRef.current < viewport.scrollTop) {
      lastScrollTopRef.current = viewport.scrollTop;
      return;
    }

    if (newIsAtBottom !== prevIsAtBottom) {
      writableStore(threadViewportStore).setState({
        isAtBottom: newIsAtBottom,
      });
    }

    lastScrollTopRef.current = viewport.scrollTop;
  }, [threadViewportStore, viewportRef]);

  const resizeRef = useOnResizeContent(() => {
    updateIsAtBottom();
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    viewport.addEventListener("scroll", updateIsAtBottom);
    updateIsAtBottom();

    return () => {
      viewport.removeEventListener("scroll", updateIsAtBottom);
    };
  }, [updateIsAtBottom, viewportRef]);

  useOnScrollToBottom(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    viewport.scrollTo({
      top: viewport.scrollHeight,
      behavior: "auto",
    });
  });

  return resizeRef;
};
