import { resource, tapState } from "@assistant-ui/tap";
import { type ClientOutput } from "@assistant-ui/store";
import { CompositeContextProvider } from "../utils/CompositeContextProvider";
import type { ModelContextState } from "../types/scopes";

export const ModelContext = resource((): ClientOutput<"modelContext"> => {
  const [state] = tapState<ModelContextState>(() => ({}));
  const composite = new CompositeContextProvider();

  return {
    state,
    methods: {
      getState: () => state,
      getModelContext: () => composite.getModelContext(),
      subscribe: (callback) => composite.subscribe(callback),
      register: (provider) => composite.registerModelContextProvider(provider),
    },
  };
});
