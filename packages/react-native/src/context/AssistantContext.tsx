import { type ReactNode, memo } from "react";
import { useAui } from "@assistant-ui/store";
import type { AssistantRuntime } from "@assistant-ui/core";
import { AssistantProviderBase } from "@assistant-ui/core/react";

export const useAssistantRuntime = (): AssistantRuntime => {
  const aui = useAui();
  const runtime = aui.threads().__internal_getAssistantRuntime?.();
  if (!runtime) {
    throw new Error(
      "useAssistantRuntime must be used within an AssistantProvider",
    );
  }
  return runtime;
};

export const AssistantProvider = memo(
  ({
    runtime,
    children,
  }: {
    runtime: AssistantRuntime;
    children: ReactNode;
  }) => {
    return (
      <AssistantProviderBase runtime={runtime}>
        {children}
      </AssistantProviderBase>
    );
  },
);
