"use client";

import {
  FC,
  PropsWithChildren,
  memo,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AssistantContext } from "../react/AssistantContext";
import { makeAssistantToolUIsStore } from "../stores/AssistantToolUIs";
import { ThreadRuntimeProvider } from "./ThreadRuntimeProvider";
import { AssistantRuntime } from "../../api/AssistantRuntime";
import { create } from "zustand";
import { writableStore } from "../ReadonlyStore";
import { AssistantRuntimeCore } from "../../runtimes/core/AssistantRuntimeCore";
import { ensureBinding } from "../react/utils/ensureBinding";
import { BackendTool, FrontendTool, HumanTool, Tool } from "assistant-stream";

// Utility type to remove the 'render' property from a tool type
// and extract argument/result types using infer
export type inferTool<T> = T extends {
  execute: (args: infer Args, context: any) => infer Result;
  render: any;
}
  ? Omit<T, "render"> & { Args: Args; Result: Result }
  : T extends { execute: (args: infer Args, context: any) => infer Result }
    ? T & { Args: Args; Result: Result }
    : T;

// CG TODO: add a way to pass in a toolbox
export namespace AssistantRuntimeProvider {
  export type Props = PropsWithChildren<{
    /**
     * The runtime to provide to the rest of your app.
     */
    runtime: AssistantRuntime;
    toolbox?: Record<
      string,
      | FrontendTool<any, any>
      | HumanTool<any, any>
      | {
          disabled?: boolean;
          type?: "backend";
          render: (args: any) => React.ReactNode;
        }
    >;
  }>;
}

const useAssistantRuntimeStore = (runtime: AssistantRuntime) => {
  const [store] = useState(() => create(() => runtime));

  useEffect(() => {
    ensureBinding(runtime);
    ensureBinding(runtime.threads);

    writableStore(store).setState(runtime, true);
  }, [runtime, store]);

  return store;
};

const useAssistantToolUIsStore = () => {
  return useMemo(() => makeAssistantToolUIsStore(), []);
};

const getRenderComponent = (runtime: AssistantRuntime) => {
  return (runtime as { _core?: AssistantRuntimeCore })._core?.RenderComponent;
};

export const AssistantRuntimeProviderImpl: FC<
  AssistantRuntimeProvider.Props
> = ({ children, runtime, toolbox }) => {
  const useAssistantRuntime = useAssistantRuntimeStore(runtime);
  const useToolUIs = useAssistantToolUIsStore();
  const [context] = useState(() => {
    return {
      useToolUIs,
      useAssistantRuntime,
    };
  });

  useEffect(() => {
    if (!toolbox) return;
    return Object.entries(toolbox).forEach(([toolName, tool]) => {
      useToolUIs
        .getState()
        .setToolUI(toolName, (tool as { render: any }).render);
    });
  }, [useToolUIs, toolbox]);

  useEffect(() => {
    if (toolbox) {
      // Remove render functions from toolbox before passing to tools
      const toolsWithoutRender = Object.fromEntries(
        Object.entries(toolbox).map(([toolName, tool]) => {
          console.log("toolname: ", toolName, tool);

          if (tool.disabled) {
            return [toolName, tool];
          }

          if (tool.type === undefined) {
            return [toolName, tool];
          }
          if (
            typeof tool === "object" &&
            tool !== null &&
            "render" in tool &&
            typeof (tool as any).render === "function"
          ) {
            // Remove the render property safely
            const { render, ...rest } = tool as inferTool<typeof tool>;
            return [toolName, rest];
          }
          return [toolName, tool];
        }),
      );
      runtime.registerModelContextProvider({
        getModelContext: () => {
          return {
            tools: toolsWithoutRender as Record<string, Tool<any, any>>,
          };
        },
      });
    }
  }, [runtime, toolbox]);

  const RenderComponent = getRenderComponent(runtime);

  return (
    <AssistantContext.Provider value={context}>
      {RenderComponent && <RenderComponent />}
      <ThreadRuntimeProvider
        runtime={runtime.thread}
        listItemRuntime={runtime.threads.mainItem}
      >
        {children}
      </ThreadRuntimeProvider>
    </AssistantContext.Provider>
  );
};

export const AssistantRuntimeProvider = memo(AssistantRuntimeProviderImpl);
