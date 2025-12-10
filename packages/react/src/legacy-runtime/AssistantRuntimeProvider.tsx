"use client";

import { FC, memo, PropsWithChildren } from "react";
import {
  useAssistantClient,
  AssistantProvider,
  Derived,
} from "@assistant-ui/store";
import { AssistantRuntime } from "./runtime/AssistantRuntime";
import { AssistantRuntimeCore } from "./runtime-cores/core/AssistantRuntimeCore";
import { RuntimeAdapter } from "./RuntimeAdapter";
import { ThreadPrimitiveViewportProvider } from "../context/providers/ThreadViewportProvider";
import { Tools } from "../model-context";
import { ModelContext } from "../client/ModelContextClient";

export namespace AssistantRuntimeProvider {
  export type Props = PropsWithChildren<{
    /**
     * The runtime to provide to the rest of your app.
     */
    runtime: AssistantRuntime;
  }>;
}

const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core?.RenderComponent;
};

export const AssistantRuntimeProviderImpl: FC<
  AssistantRuntimeProvider.Props
> = ({ children, runtime }) => {
  const aui = useAssistantClient({
    modelContext: ModelContext(),
    tools: Tools({}),
    threads: RuntimeAdapter(runtime),
    threadListItem: Derived({
      source: "threads",
      query: { type: "main" },
      get: (aui) => aui.threads().item("main"),
    }),
    thread: Derived({
      source: "threads",
      query: { type: "main" },
      get: (aui) => aui.threads().thread("main"),
    }),
    composer: Derived({
      source: "thread",
      query: {},
      get: (aui) => aui.threads().thread("main").composer,
    }),
  });

  const RenderComponent = getRenderComponent(runtime);

  return (
    <AssistantProvider client={aui}>
      {RenderComponent && <RenderComponent />}

      {/* TODO temporarily allow accessing viewport state from outside the viewport */}
      {/* TODO figure out if this behavior should be deprecated, since it is quite hacky */}
      <ThreadPrimitiveViewportProvider>
        {children}
      </ThreadPrimitiveViewportProvider>
    </AssistantProvider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
