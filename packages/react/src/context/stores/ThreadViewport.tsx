"use client";
import { create } from "zustand";
import type { Unsubscribe } from "../../utils/Unsubscribe";

export type ThreadViewportState = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  onScrollToBottom: (callback: () => void) => Unsubscribe;
};

export const makeThreadViewportStore = () => {
  const scrollToBottomListeners = new Set<() => void>();

  return create<ThreadViewportState>(() => ({
    isAtBottom: true,
    scrollToBottom: () => {
      for (const listener of scrollToBottomListeners) {
        listener();
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
