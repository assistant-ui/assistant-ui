import { resource, tapMemo, tapState } from "@assistant-ui/tap";
import { type ClientOutput } from "@assistant-ui/store";
import { CompositeContextProvider } from "../utils/CompositeContextProvider";
import type { ModelContextState } from "../types/scopes";

const version = 1;

export const ModelContext = resource((): ClientOutput<"modelContext"> => {
  const [state] = tapState<ModelContextState>(
    () => ({ version: version + 1 }) as unknown as ModelContextState,
  );
  const composite = tapMemo(() => new CompositeContextProvider(), []);

  return {
    getState: () => state,
    getModelContext: () => composite.getModelContext(),
    subscribe: (callback) => composite.subscribe(callback),
    register: (provider) => composite.registerModelContextProvider(provider),
  };
});
