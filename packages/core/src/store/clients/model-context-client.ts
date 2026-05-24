import { resource, tapEffect, tapMemo, tapState } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import { CompositeContextProvider } from "../../utils/composite-context-provider";
import type { ModelContextState } from "../scopes/model-context";

const EMPTY_TOOL_NAMES: readonly string[] = [];

const INITIAL_STATE: ModelContextState = {
  modelName: undefined,
  toolNames: EMPTY_TOOL_NAMES,
  deferredToolNames: EMPTY_TOOL_NAMES,
};

const toolNamesEqual = (a: readonly string[], b: readonly string[]): boolean =>
  a === b || (a.length === b.length && a.every((v, i) => v === b[i]));

const deriveState = (
  composite: CompositeContextProvider,
  prev: ModelContextState,
): ModelContextState => {
  const ctx = composite.getModelContext();
  const modelName = ctx.config?.modelName;
  const keys = ctx.tools ? Object.keys(ctx.tools).sort() : EMPTY_TOOL_NAMES;
  const toolNames = keys.length ? keys : EMPTY_TOOL_NAMES;
  const dkeys = ctx.deferredTools
    ? Object.keys(ctx.deferredTools).sort()
    : EMPTY_TOOL_NAMES;
  const deferredToolNames = dkeys.length ? dkeys : EMPTY_TOOL_NAMES;

  if (
    modelName === prev.modelName &&
    toolNamesEqual(toolNames, prev.toolNames) &&
    toolNamesEqual(deferredToolNames, prev.deferredToolNames)
  )
    return prev;

  return { modelName, toolNames, deferredToolNames };
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
