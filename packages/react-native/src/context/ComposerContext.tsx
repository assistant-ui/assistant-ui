import { createContext, useContext, type ReactNode } from "react";
import type { ThreadComposerRuntime } from "@assistant-ui/core";

const ComposerContext = createContext<ThreadComposerRuntime | null>(null);

export const useComposerRuntime = (): ThreadComposerRuntime => {
  const runtime = useContext(ComposerContext);
  if (!runtime) {
    throw new Error(
      "useComposerRuntime must be used within a ComposerProvider",
    );
  }
  return runtime;
};

export const ComposerProvider = ({
  runtime,
  children,
}: {
  runtime: ThreadComposerRuntime;
  children: ReactNode;
}) => {
  return (
    <ComposerContext.Provider value={runtime}>
      {children}
    </ComposerContext.Provider>
  );
};
