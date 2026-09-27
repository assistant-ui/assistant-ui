"use client";

import { type FC, type PropsWithChildren, useEffect, useState } from "react";

import {
  makeThreadViewportStore,
  type ThreadViewportStoreOptions,
} from "../stores/ThreadViewport";
import {
  ThreadViewportContext,
  type ThreadViewportContextValue,
  useThreadViewportStore,
} from "../react/ThreadViewportContext";
import { writableStore } from "../ReadonlyStore";

export type ThreadViewportProviderProps = PropsWithChildren<{
  options?: ThreadViewportStoreOptions;
}>;

const useThreadViewportStoreValue = (options: ThreadViewportStoreOptions) => {
  const outerViewport = useThreadViewportStore({ optional: true });
  // Viewport options are initial configuration. Keeping them non-reactive avoids
  // fanout through every message in long threads when anchoring config changes.
  const [store] = useState(() => makeThreadViewportStore(options));

  // Forward scrollToBottom, pauseAutoScroll, and resumeAutoScroll from outer viewport to inner viewport
  useEffect(() => {
    if (!outerViewport) return;
    const unsubScroll = outerViewport.getState().onScrollToBottom((config) => {
      store.getState().scrollToBottom(config);
    });
    const unsubPause = outerViewport.getState().onPauseAutoScroll(() => {
      return store.getState().pauseAutoScroll();
    });
    const unsubResume = outerViewport.getState().onResumeAutoScroll(() => {
      store.getState().resumeAutoScroll();
    });
    return () => {
      unsubScroll();
      unsubPause();
      unsubResume();
    };
  }, [outerViewport, store]);

  // Mirror inner viewport state outward to outer viewport
  useEffect(() => {
    if (!outerViewport) return;
    return store.subscribe((state) => {
      const outerState = outerViewport.getState();
      const isAtBottomChanged = outerState.isAtBottom !== state.isAtBottom;
      const pausedChanged =
        outerState.autoScrollPaused !== state.autoScrollPaused;
      if (isAtBottomChanged || pausedChanged) {
        writableStore(outerViewport).setState({
          isAtBottom: state.isAtBottom,
          autoScrollPaused: state.autoScrollPaused,
        });
      }
    });
  }, [store, outerViewport]);

  return store;
};

export const ThreadPrimitiveViewportProvider: FC<
  ThreadViewportProviderProps
> = ({ children, options = {} }) => {
  const useThreadViewport = useThreadViewportStoreValue(options);

  const [context] = useState<ThreadViewportContextValue>(() => {
    return {
      useThreadViewport,
    };
  });

  return (
    <ThreadViewportContext.Provider value={context}>
      {children}
    </ThreadViewportContext.Provider>
  );
};
