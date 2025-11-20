"use client";

import type { FC, PropsWithChildren } from "react";
import { useEffect, useRef } from "react";
import { makeThreadViewportStore } from "../stores/ThreadViewport";
import {
  ThreadViewportContext,
  type ThreadViewportContextValue,
} from "../react/ThreadViewportContext";

export const ThreadViewportProvider: FC<PropsWithChildren> = ({ children }) => {
  const contextRef = useRef<ThreadViewportContextValue | null>(null);

  if (!contextRef.current) {
    const store = makeThreadViewportStore();
    contextRef.current = { useThreadViewport: store };
  }

  useEffect(() => {
    return () => {
      if (contextRef.current) {
        contextRef.current = null;
      }
    };
  }, []);

  return (
    <ThreadViewportContext.Provider value={contextRef.current!}>
      {children}
    </ThreadViewportContext.Provider>
  );
};
