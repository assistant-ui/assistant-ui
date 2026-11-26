import { useState, useEffect, useCallback, useMemo } from "react";
import {
  useResources,
  resource,
  withKey,
  type ResourceElement,
} from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import {
  attachTransformScopes,
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "@assistant-ui/store/client";
import type { McpAppResourceOutput, ToolsState } from "../types/scopes/tools";
import type { Tool } from "assistant-stream";
import {
  isStandaloneToolDisplay,
  makeToolCallTextComponent,
  type ToolCallText,
  type Toolkit,
} from "../model-context/toolbox";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import { ModelContext } from "../../store/clients/model-context-client";
import { nullProtoRecord } from "../../utils/record";
import { runCleanups } from "../../subscribable/subscribable";

export type { McpAppResourceOutput };

const useTools = ({
  toolkit,
  mcpApp,
}: {
  /**
   * Tools to register: keys are the tool names the model sees. Each entry's
   * `render` or `renderText` installs a tool-call renderer, and the rest of the
   * entry is registered with model context. Keep the object referentially
   * stable (module scope or `useMemo`); a new identity unregisters and
   * re-registers every tool.
   */
  toolkit?: Toolkit;
  /**
   * Fallback renderer for MCP app tool calls: a resource that returns
   * `{ render }`. It renders a tool call whose `mcp.app.resourceUri` is a
   * `ui://` URI and that has no renderer registered under its tool name. It
   * does not register any tools.
   */
  mcpApp?: ResourceElement<McpAppResourceOutput> | undefined;
}): ClientOutput<"tools"> => {
  const mcpAppOutputs = useResources(mcpApp ? [withKey("mcpApp", mcpApp)] : []);
  const mcpAppOutput = mcpAppOutputs[0];

  const [toolUIs, setToolUIs] = useState<ToolsState["toolUIs"]>(() =>
    nullProtoRecord(),
  );

  const state = useMemo(
    (): ToolsState => ({
      toolUIs,
      mcpApp: mcpAppOutput,
    }),
    [toolUIs, mcpAppOutput],
  );

  const clientRef = useAssistantClientRef();

  const setToolUI = useCallback(
    (
      toolName: string,
      render: ToolCallMessagePartComponent,
      options?: {
        standalone?: boolean;
        renderText?: ToolCallText<any, any> | undefined;
      },
    ) => {
      // One registration object per call; identity is the removal key, so
      // the per-name list stays correctly ref-counted across re-registers.
      const registration = {
        render,
        renderText: options?.renderText,
        standalone: options?.standalone ?? false,
      };

      setToolUIs((prev) => {
        const next = nullProtoRecord(prev);
        next[toolName] = [...(next[toolName] ?? []), registration];
        return next;
      });

      return () => {
        setToolUIs((prev) => {
          const registrations =
            prev[toolName]?.filter((r) => r !== registration) ?? [];
          const next = nullProtoRecord(prev);
          if (registrations.length > 0) {
            next[toolName] = registrations;
            return next;
          }
          // Drop the key entirely so repeatedly mounted/unmounted tools
          // don't leave empty arrays accumulating across a long session.
          delete next[toolName];
          return next;
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
          // Registration has to be undone on unmount, so the registry write and
          // its unsubscribe belong to the same effect.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setToolUI(toolName, render, {
            standalone: isStandaloneToolDisplay(tool),
            renderText: toolRenderText,
          }),
        );
      }
    }

    return () => runCleanups(unsubscribes);
  }, [toolkit, setToolUI]);

  useAssistantScopeEffect(
    "modelContext",
    () => {
      if (!toolkit) return;

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
        nullProtoRecord<Tool<any, any>>(),
      );

      const modelContextProvider = {
        getModelContext: () => ({
          tools: toolsWithoutRender,
        }),
      };

      return clientRef.current!.modelContext().register(modelContextProvider);
    },
    [toolkit],
  );

  return {
    getState: () => state,
    setToolUI,
  };
};

/**
 * Registers a toolkit with the assistant client. Pass it as the `tools` scope
 * of an `AuiConfig`.
 *
 * `Tools` splits each toolkit entry in two:
 *
 * - **Renderers** go to the `tools` scope, keyed by tool name. An entry's
 *   `render`, or a component built from its `renderText`, renders the tool
 *   call in the thread. `display: "standalone"` and `human` tools render
 *   outside the collapsed tool group.
 * - **Tool definitions** go to the `modelContext` scope as one provider. The
 *   entry is registered without `render`, `renderText`, and `display`, which
 *   never reach the model. Entries with `type: "mcp"` (from
 *   `defineMcpToolkit`) are skipped: your server opens those connections.
 *
 * If neither the config nor its parent client provides a `modelContext` scope,
 * `Tools` adds one.
 *
 * Both registrations are undone when the resource unmounts and redone when
 * `toolkit` changes identity, so pass a stable toolkit (a module import or a
 * `useMemo` result). The `AuiConfig` and the `Tools(...)` element can be
 * created in the component body on every render.
 *
 * Mount `Tools` once, near the root. Tool names must be unique among the
 * providers of a `modelContext` that share a priority. The check runs when the
 * model context is merged, which happens whenever it is read (for example when
 * `modelContext.toolNames` updates after a registration, and when the runtime
 * builds a request), not when `Tools` mounts. A second registration that
 * defines the same name at the same priority then throws "You tried to define
 * a tool with the name X, but it already exists." The merge skips the check
 * when both registrations hold the identical tool object or the later tool sets
 * `overwrite: true`. Overrides registered with `useAuiToolOverrides` use a
 * higher priority and merge field by field over the toolkit entry instead.
 *
 * A nested `AuiProvider` that configures its own `tools` scope shadows the
 * outer renderers for its subtree, while the model-facing tools of both still
 * merge. When several registrations share a tool name, the first registered
 * renderer is used.
 *
 * @example
 * ```tsx
 * import toolkit from "./toolkit";
 *
 * function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
 *   const runtime = useChatRuntime();
 *   const config = AuiConfig({ tools: Tools({ toolkit }) });
 *   return (
 *     <AssistantRuntimeProvider runtime={runtime} config={config}>
 *       {children}
 *     </AssistantRuntimeProvider>
 *   );
 * }
 * ```
 */
export const Tools = resource(useTools);

attachTransformScopes(useTools, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
