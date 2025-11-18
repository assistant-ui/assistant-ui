"use client";

import { create } from "zustand";
import type { Unsubscribe } from "../../types/Unsubscribe";

export type ThreadViewportState = {
  readonly isAtBottom: boolean;
  readonly isInReadingPosition: boolean;
  readonly scrollToBottom: () => void;
  readonly scrollToUserMessage: (element: HTMLElement) => void;
  readonly onScrollToBottom: (callback: () => void) => Unsubscribe;
  readonly onScrollToUserMessage: (
    callback: (element: HTMLElement) => void,
  ) => Unsubscribe;
};

export const makeThreadViewportStore = () => {
  const scrollToBottomListeners = new Set<() => void>();
  const scrollToUserMessageListeners = new Set<
    (element: HTMLElement) => void
  >();

  return create<ThreadViewportState>(() => ({
    isAtBottom: true,
    isInReadingPosition: false,
    scrollToBottom: () => {
      for (const listener of scrollToBottomListeners) {
        listener();
      }
    },
    scrollToUserMessage: (element: HTMLElement) => {
      for (const listener of scrollToUserMessageListeners) {
        listener(element);
      }
    },
    onScrollToBottom: (callback) => {
      scrollToBottomListeners.add(callback);
      return () => {
        scrollToBottomListeners.delete(callback);
      };
    },
    onScrollToUserMessage: (callback) => {
      scrollToUserMessageListeners.add(callback);
      return () => {
        scrollToUserMessageListeners.delete(callback);
      };
    },
  }));
};
