import { type ComponentType, type ReactNode, memo } from "react";
import { useAui, AuiProvider } from "@assistant-ui/store";
import type {
  AssistantRuntime,
  AssistantRuntimeCore,
} from "@assistant-ui/core";
import { RuntimeAdapter } from "../runtimes/runtime-adapter";

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

const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core?.RenderComponent as
    | ComponentType
    | undefined;
};

export const AssistantProvider = memo(
  ({
    runtime,
    children,
  }: {
    runtime: AssistantRuntime;
    children: ReactNode;
  }) => {
    const aui = useAui({ threads: RuntimeAdapter(runtime) }, { parent: null });
    const RenderComponent = getRenderComponent(runtime);

    return (
      <AuiProvider value={aui}>
        {RenderComponent && <RenderComponent />}
        {children}
      </AuiProvider>
    );
  },
);
