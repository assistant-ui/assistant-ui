import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  useResources,
  resource,
  withKey,
  type ResourceElement,
} from "@assistant-ui/tap";
import { type ClientOutput, attachTransformScopes } from "@assistant-ui/store";
import type { McpAppResourceOutput, ToolsState } from "../types/scopes/tools";
import type { Tool } from "assistant-stream";
import {
  isStandaloneToolDisplay,
  makeToolCallTextComponent,
  type Toolkit,
} from "../model-context/toolbox";
import type { ToolCallMessagePartComponent } from "../types/MessagePartComponentTypes";
import type {
  ModelContext as ModelContextValue,
  ModelContextProvider,
} from "../../model-context/types";
import { mergeModelContexts } from "../../model-context/types";
import type { ModelContextState } from "../../store";

export type { McpAppResourceOutput };

const EMPTY_TOOL_NAMES: readonly string[] = [];
const toolsWithoutRenderCache = new WeakMap<
  Toolkit,
  Record<string, Tool<any, any>>
>();

const getToolsWithoutRender = (
  toolkit: Toolkit | undefined,
): Record<string, Tool<any, any>> | undefined => {
  if (!toolkit) return undefined;
  const cached = toolsWithoutRenderCache.get(toolkit);
  if (cached) return cached;

  const tools = Object.entries(toolkit).reduce(
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
  toolsWithoutRenderCache.set(toolkit, tools);
  return tools;
};

const getModelContextForToolkit = (toolkit: Toolkit | undefined) => ({
  tools: getToolsWithoutRender(toolkit),
});

const toolNamesEqual = (a: readonly string[], b: readonly string[]): boolean =>
  a === b || (a.length === b.length && a.every((v, i) => v === b[i]));

const deriveModelContextState = (
  provider: ModelContextProvider,
  prev: ModelContextState,
): ModelContextState => {
  const ctx = provider.getModelContext();
  const modelName = ctx.config?.modelName;
  const keys = ctx.tools ? Object.keys(ctx.tools).sort() : EMPTY_TOOL_NAMES;
  const toolNames = keys.length ? keys : EMPTY_TOOL_NAMES;

  if (modelName === prev.modelName && toolNamesEqual(toolNames, prev.toolNames))
    return prev;

  return { modelName, toolNames };
};

const INITIAL_MODEL_CONTEXT_STATE: ModelContextState = {
  modelName: undefined,
  toolNames: EMPTY_TOOL_NAMES,
};

const useToolkitModelContext = ({
  toolkit,
  parent,
}: {
  toolkit?: Toolkit | undefined;
  parent?: ModelContextProvider | undefined;
}): ClientOutput<"modelContext"> => {
  const modelContextRef = useRef<ModelContextValue>(
    getModelContextForToolkit(toolkit),
  );
  const subscribersRef = useRef(new Set<() => void>());
  const providersRef = useRef(new Set<ModelContextProvider>());

  const toolkitProvider = useMemo<ModelContextProvider>(
    () => ({
      getModelContext: () => modelContextRef.current,
      subscribe: (callback: () => void) => {
        subscribersRef.current.add(callback);
        return () => {
          subscribersRef.current.delete(callback);
        };
      },
    }),
    [],
  );

  const getModelContext = useCallback(
    () =>
      mergeModelContexts(
        new Set([
          toolkitProvider,
          ...(parent ? [parent] : []),
          ...providersRef.current,
        ]),
      ),
    [parent, toolkitProvider],
  );

  const modelContextProvider = useMemo<ModelContextProvider>(
    () => ({
      getModelContext,
      subscribe: (callback: () => void) => {
        subscribersRef.current.add(callback);
        return () => {
          subscribersRef.current.delete(callback);
        };
      },
    }),
    [getModelContext],
  );

  const [state, setState] = useState<ModelContextState>(() =>
    deriveModelContextState(modelContextProvider, INITIAL_MODEL_CONTEXT_STATE),
  );

  const notifySubscribers = useCallback(() => {
    for (const callback of subscribersRef.current) callback();
  }, []);

  useEffect(() => {
    modelContextRef.current = getModelContextForToolkit(toolkit);
    notifySubscribers();
  }, [toolkit, notifySubscribers]);

  useEffect(() => {
    if (!parent) return undefined;
    return parent.subscribe?.(notifySubscribers);
  }, [notifySubscribers, parent]);

  useEffect(() => {
    setState((prev) => deriveModelContextState(modelContextProvider, prev));
    return modelContextProvider.subscribe?.(() => {
      setState((prev) => deriveModelContextState(modelContextProvider, prev));
    });
  }, [modelContextProvider]);

  const register = useCallback(
    (provider: ModelContextProvider) => {
      providersRef.current.add(provider);
      const unsubscribe = provider.subscribe?.(notifySubscribers);
      notifySubscribers();
      return () => {
        providersRef.current.delete(provider);
        unsubscribe?.();
        notifySubscribers();
      };
    },
    [notifySubscribers],
  );

  return useMemo(
    (): ClientOutput<"modelContext"> => ({
      getState: () => deriveModelContextState(modelContextProvider, state),
      getModelContext,
      subscribe: (callback) => modelContextProvider.subscribe!(callback),
      register,
    }),
    [getModelContext, modelContextProvider, register, state],
  );
};

const ToolkitModelContext = resource(useToolkitModelContext);

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
  const mcpAppOutputs = useResources(mcpApp ? [withKey("mcpApp", mcpApp)] : []);
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
          const rest = { ...prev };
          delete rest[toolName];
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

    return () => {
      unsubscribes.forEach((fn) => fn());
    };
  }, [toolkit, setToolUI]);

  return {
    getState: () => state,
    setToolUI,
  };
};

export const Tools = resource(useTools);

attachTransformScopes(useTools, (scopes, parent) => {
  if (!scopes.modelContext && scopes.tools?.hook === useTools) {
    const [{ toolkit }] = scopes.tools.args as [
      {
        toolkit?: Toolkit | undefined;
      },
    ];
    scopes.modelContext = ToolkitModelContext({
      toolkit,
      parent:
        parent.modelContext.source === null ? undefined : parent.modelContext(),
    });
  }
});
