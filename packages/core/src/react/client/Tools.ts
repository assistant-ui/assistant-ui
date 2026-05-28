import {
  resource,
  tapState,
  tapEffect,
  tapCallback,
  tapMemo,
  tapResources,
  withKey,
  type ResourceElement,
} from "@assistant-ui/tap";
import {
  tapAssistantClientRef,
  type ClientOutput,
  attachTransformScopes,
} from "@assistant-ui/store";
import type { McpAppResourceOutput, ToolsState } from "../types/scopes/tools";
import type { Tool } from "assistant-stream";
import type { Toolkit } from "../model-context/toolbox";
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
export const Tools = resource(
  ({
    toolkit,
    mcpApp,
  }: {
    /** Tools to expose to the model and optional renderers to install. */
    toolkit?: Toolkit;
    /** Optional MCP app resource whose tools should be merged into context. */
    mcpApp?: ResourceElement<McpAppResourceOutput> | undefined;
  }): ClientOutput<"tools"> => {
    const mcpAppOutputs = tapResources(
      () => (mcpApp ? [withKey("mcpApp", mcpApp)] : []),
      [mcpApp],
    );
    const mcpAppOutput = mcpAppOutputs[0];

    const [toolsState, setToolsState] = tapState<{
      tools: ToolsState["tools"];
    }>(() => ({
      tools: {},
    }));

    const state = tapMemo(
      (): ToolsState => ({ tools: toolsState.tools, mcpApp: mcpAppOutput }),
      [toolsState, mcpAppOutput],
    );

    const clientRef = tapAssistantClientRef();

    const setToolUI = tapCallback(
      (toolName: string, render: ToolCallMessagePartComponent) => {
        setToolsState((prev) => ({
          tools: {
            ...prev.tools,
            [toolName]: [...(prev.tools[toolName] ?? []), render],
          },
        }));

        return () => {
          setToolsState((prev) => ({
            tools: {
              ...prev.tools,
              [toolName]:
                prev.tools[toolName]?.filter((r) => r !== render) ?? [],
            },
          }));
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
