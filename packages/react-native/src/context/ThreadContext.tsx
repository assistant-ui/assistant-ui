import { createContext, useContext, type ReactNode } from "react";
import type { ThreadRuntime } from "@assistant-ui/core";

const ThreadContext = createContext<ThreadRuntime | null>(null);

export const useThreadRuntime = (): ThreadRuntime => {
  const runtime = useContext(ThreadContext);
  if (!runtime) {
    throw new Error("useThreadRuntime must be used within a ThreadProvider");
  }
  return runtime;
};

export const ThreadProvider = ({
  runtime,
  children,
}: {
  runtime: ThreadRuntime;
  children: ReactNode;
}) => {
  return (
    <ThreadContext.Provider value={runtime}>{children}</ThreadContext.Provider>
  );
};
