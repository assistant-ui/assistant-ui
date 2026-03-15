import { resource, tapEffect, tapMemo, tapState } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { CompositeContextProvider } from "../../utils/composite-context-provider";
import type { ModelContextState } from "../scopes/model-context";

const EMPTY_TOOL_NAMES: readonly string[] = [];

const toolNamesEqual = (
  a: readonly string[],
  b: readonly string[],
): boolean => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const deriveState = (
  composite: CompositeContextProvider,
  prev: ModelContextState,
): ModelContextState => {
  const ctx = composite.getModelContext();
  const modelName = ctx.config?.modelName;
  const toolKeys = ctx.tools
    ? (Object.keys(ctx.tools) as readonly string[])
    : undefined;
  const toolNames = toolKeys?.length ? toolKeys : EMPTY_TOOL_NAMES;

  if (modelName === prev.modelName && toolNamesEqual(toolNames, prev.toolNames))
    return prev;

  return { modelName, toolNames };
};

export const ModelContext = resource((): ClientOutput<"modelContext"> => {
  const composite = tapMemo(() => new CompositeContextProvider(), []);
  const [state, setState] = tapState<ModelContextState>(() => ({
    modelName: undefined,
    toolNames: EMPTY_TOOL_NAMES,
  }));

  tapEffect(() => {
    return composite.subscribe(() => {
      setState((prev) => deriveState(composite, prev));
    });
  }, [composite]);

  return {
    getState: () => state,
    getModelContext: () => composite.getModelContext(),
    subscribe: (callback) => composite.subscribe(callback),
    register: (provider) => composite.registerModelContextProvider(provider),
  };
});
