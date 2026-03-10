import { type ReactNode, memo } from "react";
import { useAui, type AssistantClient } from "@assistant-ui/store";
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

export const AssistantRuntimeProvider = memo(
  ({
    runtime,
    aui,
    children,
  }: {
    runtime: AssistantRuntime;
    aui?: AssistantClient | null;
    children: ReactNode;
  }) => {
    return (
      <AssistantProviderBase runtime={runtime} aui={aui ?? null}>
        {children}
      </AssistantProviderBase>
    );
  },
);
