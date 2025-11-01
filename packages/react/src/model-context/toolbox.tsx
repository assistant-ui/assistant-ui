"use client";

import { useEffect } from "react";
import type { ComponentType, ReactNode } from "react";
import type { Tool } from "assistant-stream";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import { useAssistantApi } from "../context/react/AssistantApiContext";

export type ToolDefinition<
  TArgs extends Record<string, unknown>,
  TResult,
> = Tool<TArgs, TResult> & {
  render?: ToolCallMessagePartComponent<TArgs, TResult> | undefined;
};

export const FallbackSymbol = Symbol("Toolkit.Fallback");
export const LayoutSymbol = Symbol("Toolkit.Layout");

export type ToolkitFallback = {
  render: ToolCallMessagePartComponent<any, any>;
};

export type ToolkitLayout = {
  render: ComponentType<{ children: ReactNode }>;
};

export type Toolkit = Record<string, ToolDefinition<any, any>> & {
  [FallbackSymbol]?: ToolkitFallback;
  [LayoutSymbol]?: ToolkitLayout;
};

export const Toolkit = {
  Fallback: FallbackSymbol,
  Layout: LayoutSymbol,
} as const;

export type ToolsConfig = {
  toolkit: Toolkit;
};

/** @deprecated Use the Tools tap resource from the client instead */
const _LegacyTools = (config: ToolsConfig) => {
  return () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const api = useAssistantApi();

    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const unsubscribes: (() => void)[] = [];

      // Get special toolkit items
      const fallback = config.toolkit[FallbackSymbol];
      const layout = config.toolkit[LayoutSymbol];

      // Register fallback UI
      if (fallback?.render) {
        const unsubscribe = api.toolUIs().setFallbackToolUI(fallback.render);
        unsubscribes.push(unsubscribe);
      }

      // Register layout
      if (layout?.render) {
        const unsubscribe = api.toolUIs().setToolUILayout(layout.render);
        unsubscribes.push(unsubscribe);
      }

      // Register tool UIs (exclude symbols)
      for (const [toolName, tool] of Object.entries(config.toolkit)) {
        if (tool.render) {
          const unsubscribe = api.toolUIs().setToolUI(toolName, tool.render);
          unsubscribes.push(unsubscribe);
        }
      }

      // Register tools with model context (exclude symbols)
      const toolsWithoutRender = Object.entries(config.toolkit).reduce(
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

      const unsubscribe =
        api.registerModelContextProvider(modelContextProvider);
      unsubscribes.push(unsubscribe);

      return () => {
        unsubscribes.forEach((fn) => fn());
      };
    }, [api]);

    return null;
  };
};

// Keep for backward compatibility but don't export
export { _LegacyTools as Tools };
