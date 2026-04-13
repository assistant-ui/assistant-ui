import { resource, tapState, tapEffect, tapCallback } from "@assistant-ui/tap";
import {
  tapAssistantClientRef,
  type ClientOutput,
  attachTransformScopes,
} from "@assistant-ui/store";
import type { ToolsState } from "../types/scopes/tools";
import type { Tool } from "assistant-stream";
import type { Toolkit } from "../model-context/toolbox";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import { ModelContext } from "../../store";

export const Tools = resource(
  ({ toolkit }: { toolkit?: Toolkit }): ClientOutput<"tools"> => {
    const [state, setState] = tapState<ToolsState>(() => ({
      tools: {},
    }));

    const clientRef = tapAssistantClientRef();

    const setToolUI = tapCallback(
      (toolName: string, render: ToolCallMessagePartComponent) => {
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
                [toolName]:
                  prev.tools[toolName]?.filter((r) => r !== render) ?? [],
              },
            };
          });
        };
      },
      [],
    );

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

      unsubscribes.push(
        clientRef.current!.modelContext().register(modelContextProvider),
      );

      return () => {
        unsubscribes.forEach((fn) => fn());
      };
    }, [toolkit, setToolUI, clientRef]);

    return {
      getState: () => state,
      setToolUI,
    };
  },
);

attachTransformScopes(Tools, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
