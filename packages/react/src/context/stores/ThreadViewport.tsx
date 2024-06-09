"use client";
import { create } from "zustand";

export type ThreadViewportState = {
  isAtBottom: boolean;
  scrollToBottom: () => void;
  onScrollToBottom: (callback: () => void) => () => void;
};

export const makeViewportStore = () => {
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
