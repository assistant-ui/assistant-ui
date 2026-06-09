import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useResources,
  resource,
  withKey,
  type ResourceElement,
} from "@assistant-ui/tap";
import {
  useAssistantClientRef,
  type ClientOutput,
  attachTransformScopes,
} from "@assistant-ui/store";
import type { McpAppResourceOutput, ToolsState } from "../types/scopes/tools";
import type { Tool } from "assistant-stream";
import {
  isStandaloneToolDisplay,
  makeToolCallTextComponent,
  type Toolkit,
} from "../model-context/toolbox";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import { ModelContext } from "../../store";

export type { McpAppResourceOutput };

/**
 * Registers tools with model context and installs tool-call renderers.
 *
 * Mount this resource near an assistant subtree when you want to expose a
 * group of tools declaratively. Tool definitions are registered with model
 * context, while each tool renderer is registered with the tools scope for
 * message rendering.
 */
const useTools = ({
  toolkit,
  mcpApp,
}: {
  /** Tools to expose to the model and optional renderers to install. */
  toolkit?: Toolkit;
  /** Optional MCP app resource whose tools should be merged into context. */
  mcpApp?: ResourceElement<McpAppResourceOutput> | undefined;
}): ClientOutput<"tools"> => {
  const mcpAppOutputs = useResources(
    () => (mcpApp ? [withKey("mcpApp", mcpApp)] : []),
    [mcpApp],
  );
  const mcpAppOutput = mcpAppOutputs[0];

  const [toolUIs, setToolUIs] = useState<ToolsState["toolUIs"]>(() => ({}));

  const state = useMemo(
    (): ToolsState => ({
      toolUIs,
      mcpApp: mcpAppOutput,
      // Deprecated component-only view, derived from `toolUIs`. Removed in v0.15.
      tools: Object.fromEntries(
        Object.entries(toolUIs).map(([name, regs]) => [
          name,
          regs.map((r) => r.render),
        ]),
      ),
    }),
    [toolUIs, mcpAppOutput],
  );

  const clientRef = useAssistantClientRef();

  const setToolUI = useCallback(
    (
      toolName: string,
      render: ToolCallMessagePartComponent,
      options?: { standalone?: boolean },
    ) => {
      // One registration object per call; identity is the removal key, so
      // the per-name list stays correctly ref-counted across re-registers.
      const registration = {
        render,
        standalone: options?.standalone ?? false,
      };

      setToolUIs((prev) => ({
        ...prev,
        [toolName]: [...(prev[toolName] ?? []), registration],
      }));

      return () => {
        setToolUIs((prev) => {
          const next = prev[toolName]?.filter((r) => r !== registration) ?? [];
          if (next.length > 0) return { ...prev, [toolName]: next };
          // Drop the key entirely so repeatedly mounted/unmounted tools
          // don't leave empty arrays accumulating across a long session.
          const { [toolName]: _removed, ...rest } = prev;
          return rest;
        });
      };
    },
    [],
  );

  useEffect(() => {
    if (!toolkit) return;
    const unsubscribes: (() => void)[] = [];

    // Register tool UIs (exclude symbols)
    for (const [toolName, tool] of Object.entries(toolkit)) {
      const toolRender = "render" in tool ? tool.render : undefined;
      const toolRenderText = "renderText" in tool ? tool.renderText : undefined;
      const render =
        toolRender ??
        (toolRenderText
          ? makeToolCallTextComponent(toolRenderText)
          : undefined);
      if (render) {
        unsubscribes.push(
          setToolUI(toolName, render, {
            standalone: isStandaloneToolDisplay(tool),
          }),
        );
      }
    }

    // Register tools with model context (exclude symbols). `render`,
    // `renderText`, and `display` are client-only presentation concerns and
    // never reach the model.
    const toolsWithoutRender = Object.entries(toolkit).reduce(
      (acc, [name, tool]) => {
        if (tool.type === "mcp") return acc;
        const {
          display: _display,
          render: _render,
          renderText: _renderText,
          ...rest
        } = tool as typeof tool & { renderText?: unknown };
        acc[name] = rest as Tool<any, any>;
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
};

export const Tools = resource(useTools);

attachTransformScopes(Tools, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
