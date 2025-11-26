"use client";

import { create } from "zustand";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type ThreadViewportState = {
  readonly isAtBottom: boolean;
  readonly scrollToBottom: (config?: {
    behavior?: ScrollBehavior | undefined;
  }) => void;
  readonly onScrollToBottom: (
    callback: ({ behavior }: { behavior: ScrollBehavior }) => void,
  ) => Unsubscribe;
};

export const makeThreadViewportStore = () => {
  const scrollToBottomListeners = new Set<
    (config: { behavior: ScrollBehavior }) => void
  >();

  return create<ThreadViewportState>(() => ({
    isAtBottom: true,
    scrollToBottom: ({ behavior = "auto" } = {}) => {
      for (const listener of scrollToBottomListeners) {
        listener({ behavior });
      }
    },
    onScrollToBottom: (callback) => {
      scrollToBottomListeners.add(callback);
      return () => {
        scrollToBottomListeners.delete(callback);
      };
    },
  }));
};
