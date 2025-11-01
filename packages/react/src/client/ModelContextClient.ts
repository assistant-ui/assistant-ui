import { resource, tapState } from "@assistant-ui/tap";
import { tapApi } from "../utils/tap-store";
import { CompositeContextProvider } from "../utils/CompositeContextProvider";
import type { ModelContextState, ModelContextApi } from "./types/ModelContext";

export const ModelContext = resource(() => {
  const [state] = tapState<ModelContextState>(() => ({}));
  const composite = new CompositeContextProvider();

  return tapApi<ModelContextApi>({
    getState: () => state,
    getModelContext: () => composite.getModelContext(),
    subscribe: (callback) => composite.subscribe(callback),
    register: (provider) => composite.registerModelContextProvider(provider),
  });
});
