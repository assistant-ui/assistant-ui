"use client";

import {
  ComponentType,
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
import { FrontendTool, Tool } from "assistant-stream";
import { ToolCallContentPartProps } from "../..";

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

export namespace AssistantRuntimeProvider {
  export type Props = PropsWithChildren<{
    /**
     * The runtime to provide to the rest of your app.
     */
    runtime: AssistantRuntime;
    toolbox?: {
      tools: Record<
        string,
        | FrontendTool<any, any>
        | {
            render: ComponentType<ToolCallContentPartProps<any, any>>;
            disabled?: boolean;
          }
      >;
      // useTool: (name: any) => {
      //   setUI: (ui: () => React.ReactNode) => void;
      // };
    };
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
    return Object.entries(toolbox.tools).forEach(([toolName, tool]) => {
      if (tool.disabled || tool?.render === false) {
        return;
      }

      useToolUIs
        .getState()
        .setToolUI(toolName, (tool as { render: any }).render);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolbox]);

  useEffect(() => {
    if (toolbox) {
      // Remove render functions from toolbox before passing to tools
      const tools = Object.fromEntries(
        Object.entries(toolbox.tools)
          .map(([toolName, tool]) => {
            const { render, ...rest } = tool;
            return [toolName, rest];
          })
          .filter(([, tool]) => (tool as Tool<any, any>)?.execute)
          .filter(
            ([, tool]) =>
              tool && typeof tool === "object" && Object.keys(tool).length > 0,
          ),
      );

      runtime.registerModelContextProvider({
        getModelContext: () => {
          return {
            tools: tools as Record<string, Tool<any, any>>,
          };
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolbox]);

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
