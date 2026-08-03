import {
  memo,
  type ComponentType,
  type FC,
  type PropsWithChildren,
} from "react";
import {
  AuiConfig,
  AuiProvider,
  type AssistantClient,
} from "@assistant-ui/store";
import type { AssistantRuntime } from "../runtime/api/assistant-runtime";
import type { AssistantRuntimeCore } from "../runtime/interfaces/assistant-runtime-core";
import { RuntimeAdapter } from "./RuntimeAdapter";

export const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core
    ?.RenderComponent as ComponentType | undefined;
};

export type AssistantProviderBaseProps = PropsWithChildren<{
  runtime: AssistantRuntime;
  aui?: AssistantClient | null | undefined;
  config?: AuiConfig | undefined;
}>;

const AssistantProviderInner: FC<
  PropsWithChildren<{
    runtime: AssistantRuntime;
    aui: AssistantClient | null;
    config: AuiConfig | undefined;
  }>
> = ({ runtime, aui, config, children }) => {
  // The runtime has a stable identity but mutates in place: its options are
  // pushed in by an unconditional effect inside <RenderComponent />, so that
  // element must be re-created every commit for React to re-render it and
  // re-run the effect. React Compiler caches <RenderComponent /> on the
  // stable RenderComponent type, which silences the effect and stops option
  // changes (e.g. unstable_enableMessageQueue) from reaching the runtime.
  "use no memo";
  const RenderComponent = getRenderComponent(runtime);
  const merged = AuiConfig({ ...config, threads: RuntimeAdapter(runtime) });
  return (
    <AuiProvider extends={aui} config={merged}>
      {RenderComponent && <RenderComponent />}
      {children}
    </AuiProvider>
  );
};

export const AssistantProviderBase: FC<AssistantProviderBaseProps> = memo(
  ({ runtime, aui = null, config, children }) => (
    <AssistantProviderInner runtime={runtime} aui={aui} config={config}>
      {children}
    </AssistantProviderInner>
  ),
);
