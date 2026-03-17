import {
  memo,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react";
import { useAui, AuiProvider, type AssistantClient } from "@assistant-ui/store";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import type { AssistantRuntimeCore } from "../runtime/interfaces/assistant-runtime-core";
import { RuntimeAdapter } from "./RuntimeAdapter";

export const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core?.RenderComponent as
    | ComponentType
    | undefined;
};

export type AssistantProviderBaseProps = PropsWithChildren<{
  runtime: AssistantRuntime;
  aui?: AssistantClient | null;
}>;

export const AssistantProviderBase: FC<AssistantProviderBaseProps> = memo(
  ({ runtime, aui: parent = null, children }) => {
    const aui = useAui({ threads: RuntimeAdapter(runtime) }, { parent });
    const RenderComponent = getRenderComponent(runtime);
    return (
      <AuiProvider value={aui}>
        {RenderComponent && <RenderComponent />}
        {children}
      </AuiProvider>
    );
  },
);
