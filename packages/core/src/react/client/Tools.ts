import { resource, tapState, tapEffect, tapCallback } from "@assistant-ui/tap";
import {
  tapAssistantClientRef,
  type ClientOutput,
  attachTransformScopes,
} from "@assistant-ui/store";
import { ToolsState } from "../types/scopes";
import type { Tool } from "assistant-stream";
import { type Toolkit } from "../model-context/toolbox";
import { ToolCallMessagePartComponent } from "../types";
import { ModelContext } from "../../store";
import { clearToolActivityState, setToolActivityState } from "./tools-state";

export const Tools = resource(
  ({ toolkit }: { toolkit?: Toolkit }): ClientOutput<"tools"> => {
    const [state, setState] = tapState<ToolsState>(() => ({
      tools: {},
      toolActivities: {},
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

    const setToolActivity = tapCallback(
      (toolName: string, activity: ToolsState["toolActivities"][string]) => {
        setState((prev) => setToolActivityState(prev, toolName, activity));

        return () => {
          setState((prev) => clearToolActivityState(prev, toolName, activity));
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
        if (tool.activity) {
          unsubscribes.push(setToolActivity(toolName, tool.activity));
        }
      }

      // Register tools with model context (exclude symbols)
      const toolsWithoutRender = Object.entries(toolkit).reduce(
        (acc, [name, tool]) => {
          const { render, activity, ...rest } = tool;
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
    }, [toolkit, setToolUI, setToolActivity, clientRef]);

    return {
      getState: () => state,
      setToolUI,
      setToolActivity,
    };
  },
);

attachTransformScopes(Tools, (scopes, parent) => ({
  ...scopes,
  ...(scopes.modelContext || parent.modelContext.source !== null
    ? {}
    : { modelContext: ModelContext() }),
}));
