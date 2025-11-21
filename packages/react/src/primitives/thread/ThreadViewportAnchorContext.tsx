"use client";

import {
  createContext,
  useCallback,
  useContext,
  type RefCallback,
} from "react";

type ThreadViewportAnchorContextValue = {
  registerLastUserMessageScrollAnchor: (node: HTMLElement | null) => void;
};

const ThreadViewportAnchorContext =
  createContext<ThreadViewportAnchorContextValue | null>(null);

export const ThreadViewportAnchorProvider =
  ThreadViewportAnchorContext.Provider;

export const useRegisterLastUserMessageScrollAnchor =
  (): RefCallback<HTMLElement> => {
    const context = useContext(ThreadViewportAnchorContext);
    if (!context) {
      throw new Error(
        "useRegisterLastUserMessageScrollAnchor must be used within ThreadPrimitive.Viewport",
      );
    }

    return useCallback(
      (node: HTMLElement | null) => {
        context.registerLastUserMessageScrollAnchor(node);
      },
      [context],
    );
  };
