import type { ReactNode } from "react";
import type { ThreadRuntime } from "@assistant-ui/core";
import { useAui } from "@assistant-ui/store";

/**
 * @deprecated Use AssistantProvider with the store system instead.
 * The thread scope is automatically set up by the RuntimeAdapter.
 */
export const useThreadRuntime = (): ThreadRuntime => {
  const aui = useAui();
  const runtime = aui.threads().thread("main").__internal_getRuntime?.();
  if (!runtime) {
    throw new Error(
      "useThreadRuntime must be used within an AssistantProvider",
    );
  }
  return runtime as ThreadRuntime;
};

/**
 * @deprecated Use AssistantProvider with the store system instead.
 */
export const ThreadProvider = ({
  children,
}: {
  runtime: ThreadRuntime;
  children: ReactNode;
}) => {
  return <>{children}</>;
};
