import { resource, tapMemo, tapState } from "@assistant-ui/tap";
import type { ClientOutput } from "../types/client";
import { CompositeContextProvider } from "../../utils";
import type { ModelContextState } from "../scopes";

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
