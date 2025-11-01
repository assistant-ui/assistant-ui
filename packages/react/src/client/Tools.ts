import { resource, tapState, tapEffect } from "@assistant-ui/tap";
import { tapApi } from "../utils/tap-store";
import { tapModelContext } from "./ModelContext";
import { tapToolUI } from "./ToolUIContext";
import { ToolsState, ToolsApi } from "./types/Tools";
import type { Tool } from "assistant-stream";
import {
  type Toolkit,
  FallbackSymbol,
  LayoutSymbol,
} from "../model-context/toolbox";

export const Tools = resource(({ toolkit }: { toolkit?: Toolkit }) => {
  const [state] = tapState<ToolsState>(() => ({}));

  const modelContext = tapModelContext();
  const toolUI = tapToolUI();

  tapEffect(() => {
    if (!toolkit) return;
    const unsubscribes: (() => void)[] = [];

    // Register fallback UI
    const fallback = toolkit[FallbackSymbol];
    if (fallback?.render) {
      unsubscribes.push(toolUI.setFallbackToolUI(fallback.render));
    }

    // Register layout
    const layout = toolkit[LayoutSymbol];
    if (layout?.render) {
      unsubscribes.push(toolUI.setToolUILayout(layout.render));
    }

    // Register tool UIs (exclude symbols)
    for (const [toolName, tool] of Object.entries(toolkit)) {
      if (tool.render) {
        unsubscribes.push(toolUI.setToolUI(toolName, tool.render));
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
  }, [toolkit, modelContext, toolUI]);

  return tapApi<ToolsApi>({
    getState: () => state,
  });
});
