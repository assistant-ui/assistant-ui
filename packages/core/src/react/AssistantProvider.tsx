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
  return (runtime as { _core?: AssistantRuntimeCore })._core
    ?.RenderComponent as ComponentType | undefined;
};

export type AssistantProviderBaseProps = PropsWithChildren<{
  runtime: AssistantRuntime;
  aui?: AssistantClient | null;
}>;

const AssistantProviderInner: FC<
  PropsWithChildren<{ runtime: AssistantRuntime }>
> = ({ runtime, children }) => {
  // The runtime has a stable identity but mutates in place: its options are
  // pushed in by an unconditional effect inside <RenderComponent />, so that
  // element must be re-created every commit for React to re-render it and
  // re-run the effect. React Compiler caches <RenderComponent /> on the
  // stable RenderComponent type, which silences the effect and stops option
  // changes (e.g. unstable_enableMessageQueue) from reaching the runtime.
  "use no memo";
  const aui = useAui({ threads: RuntimeAdapter(runtime) });
  const RenderComponent = getRenderComponent(runtime);
  return (
    <AuiProvider value={aui}>
      {RenderComponent && <RenderComponent />}
      {children}
    </AuiProvider>
  );
};

export const AssistantProviderBase: FC<AssistantProviderBaseProps> = memo(
  ({ runtime, aui = null, children }) => {
    const inner = (
      <AssistantProviderInner runtime={runtime}>
        {children}
      </AssistantProviderInner>
    );
    return aui ? (
      <AuiProvider value={aui}>{inner}</AuiProvider>
    ) : (
      <AuiProvider value={null}>{inner}</AuiProvider>
    );
  },
);
