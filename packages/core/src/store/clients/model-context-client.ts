import { resource, tapEffect, tapMemo, tapState } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { CompositeContextProvider } from "../../utils/composite-context-provider";
import type { ModelContextState } from "../scopes/model-context";

const EMPTY_TOOL_NAMES: readonly string[] = [];

const INITIAL_STATE: ModelContextState = {
  modelName: undefined,
  toolNames: EMPTY_TOOL_NAMES,
};

const toolNamesEqual = (
  a: readonly string[],
  b: readonly string[],
): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  const seen = new Set(a);
  for (const name of b) if (!seen.has(name)) return false;
  return true;
};

const deriveState = (
  composite: CompositeContextProvider,
  prev: ModelContextState,
): ModelContextState => {
  const ctx = composite.getModelContext();
  const modelName = ctx.config?.modelName;
  const keys = ctx.tools ? Object.keys(ctx.tools).sort() : EMPTY_TOOL_NAMES;
  const toolNames = keys.length ? keys : EMPTY_TOOL_NAMES;

  if (modelName === prev.modelName && toolNamesEqual(toolNames, prev.toolNames))
    return prev;

  return { modelName, toolNames };
};

export const ModelContext = resource((): ClientOutput<"modelContext"> => {
  const composite = tapMemo(() => new CompositeContextProvider(), []);
  const [state, setState] = tapState<ModelContextState>(() =>
    deriveState(composite, INITIAL_STATE),
  );

  tapEffect(() => {
    setState((prev) => deriveState(composite, prev));
    return composite.subscribe(() => {
      setState((prev) => deriveState(composite, prev));
    });
  }, [composite]);

  return {
    getState: () => deriveState(composite, state),
    getModelContext: () => composite.getModelContext(),
    subscribe: (callback) => composite.subscribe(callback),
    register: (provider) => composite.registerModelContextProvider(provider),
  };
});
