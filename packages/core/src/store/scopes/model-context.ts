import type { Unsubscribe } from "../../types";
import type { ModelContextProvider } from "../../model-context";

export type ModelContextState = Record<string, never>;

export type ModelContextMethods = ModelContextProvider & {
  getState(): ModelContextState;
  register: (provider: ModelContextProvider) => Unsubscribe;
};

export type ModelContextClientSchema = {
  methods: ModelContextMethods;
};
