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

  // Forward scrollToBottom from outer viewport to inner viewport
  useEffect(() => {
    return outerViewport?.getState().onScrollToBottom((config) => {
      store.getState().scrollToBottom(config);
    });
  }, [outerViewport, store]);

  useEffect(() => {
    if (!outerViewport) return;
    const syncPauseState = (autoScrollPaused: boolean) => {
      if (store.getState().autoScrollPaused === autoScrollPaused) return;
      writableStore(store).setState({ autoScrollPaused });
    };
    syncPauseState(outerViewport.getState().autoScrollPaused);
    return outerViewport.subscribe((state) => {
      syncPauseState(state.autoScrollPaused);
    });
  }, [store, outerViewport]);

  useEffect(() => {
    if (!outerViewport) return;
    return store.subscribe((state) => {
      const outerState = outerViewport.getState();
      if (
        outerState.isAtBottom !== state.isAtBottom ||
        outerState.autoScrollPaused !== state.autoScrollPaused
      ) {
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
