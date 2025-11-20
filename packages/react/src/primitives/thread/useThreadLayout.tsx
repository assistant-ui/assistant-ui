"use client";

import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
} from "react";

export type ThreadLayoutState = {
  readonly composerHeight: number;
  readonly viewportHeight: number;
};

const ThreadLayoutContext = createContext<ThreadLayoutState | null>(null);

export const ThreadLayoutProvider: FC<
  PropsWithChildren<{ value: ThreadLayoutState }>
> = ({ value, children }) => (
  <ThreadLayoutContext.Provider value={value}>
    {children}
  </ThreadLayoutContext.Provider>
);

export const useThreadLayout = () => {
  const context = useContext(ThreadLayoutContext);
  if (!context) {
    throw new Error(
      "useThreadLayout must be used within ThreadPrimitive.Viewport",
    );
  }

  return context;
};
