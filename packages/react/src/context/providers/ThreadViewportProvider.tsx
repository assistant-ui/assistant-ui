"use client";

import type { FC, PropsWithChildren } from "react";
import { useEffect, useState } from "react";
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
    return outerViewport?.getState().onScrollToBottom(() => {
      store.getState().scrollToBottom();
    });
  }, [outerViewport, store]);

  useEffect(() => {
    if (!outerViewport) return;
    return store.subscribe((state) => {
      if (outerViewport.getState().isAtBottom !== state.isAtBottom) {
        writableStore(outerViewport).setState({ isAtBottom: state.isAtBottom });
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
