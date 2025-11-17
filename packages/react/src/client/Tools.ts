import { resource, tapState, tapEffect } from "@assistant-ui/tap";
import { tapApi } from "../utils/tap-store";
import { tapModelContext } from "./ModelContext";
import { ToolsState, ToolsApi } from "./types/Tools";
import type { Tool } from "assistant-stream";
import { type Toolkit } from "../model-context/toolbox";

export const Tools = resource(({ toolkit }: { toolkit?: Toolkit }) => {
  const [state, setState] = tapState<ToolsState>(() => ({
    tools: {},
  }));

  const modelContext = tapModelContext();

  tapEffect(() => {
    if (!toolkit) return;
    const unsubscribes: (() => void)[] = [];

    // Register tool UIs (exclude symbols)
    for (const [toolName, tool] of Object.entries(toolkit)) {
      if (tool.render) {
        unsubscribes.push(setToolUI(toolName, tool.render));
      }
    }

    // Register tools with model context (exclude symbols)
    const toolsWithoutRender = Object.entries(toolkit).reduce(
      (acc, [name, tool]) => {
        const { render, ...rest } = tool;
        acc[name] = rest;
        return acc;
      },
      {} as Record<string, Tool<any, any>>,
    );

    const modelContextProvider = {
      getModelContext: () => ({
        tools: toolsWithoutRender,
      }),
    };

    unsubscribes.push(modelContext.register(modelContextProvider));

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [toolkit, modelContext]);

  const setToolUI = (toolName: string, render: any) => {
    setState((prev) => {
      return {
        ...prev,
        tools: {
          ...prev.tools,
          [toolName]: [...(prev.tools[toolName] ?? []), render],
        },
      };
    });

    return () => {
      setState((prev) => {
        return {
          ...prev,
          tools: {
            ...prev.tools,
            [toolName]: prev.tools[toolName]?.filter((r) => r !== render) ?? [],
          },
        };
      });
    };
  };

  return tapApi<ToolsApi>({
    getState: () => state,
    setToolUI,
  });
});
