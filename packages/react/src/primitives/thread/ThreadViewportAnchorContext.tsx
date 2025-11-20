"use client";

import {
  createContext,
  useCallback,
  useContext,
  type RefCallback,
} from "react";

type ThreadViewportAnchorContextValue = {
  registerLastUserMessageAnchor: (node: HTMLElement | null) => void;
};

const ThreadViewportAnchorContext =
  createContext<ThreadViewportAnchorContextValue | null>(null);

export const ThreadViewportAnchorProvider =
  ThreadViewportAnchorContext.Provider;

export const useRegisterLastUserMessageAnchor =
  (): RefCallback<HTMLElement> => {
    const context = useContext(ThreadViewportAnchorContext);
    if (!context) {
      throw new Error(
        "useRegisterLastUserMessageAnchor must be used within ThreadPrimitive.Viewport",
      );
    }

    return useCallback(
      (node: HTMLElement | null) => {
        context.registerLastUserMessageAnchor(node);
      },
      [context],
    );
  };
