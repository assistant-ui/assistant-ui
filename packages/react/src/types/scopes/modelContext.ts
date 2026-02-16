import type { Unsubscribe, ModelContextProvider } from "@assistant-ui/core";

export type ModelContextState = Record<string, never>;

export type ModelContextMethods = ModelContextProvider & {
  getState(): ModelContextState;
  register: (provider: ModelContextProvider) => Unsubscribe;
};

export type ModelContextClientSchema = {
  methods: ModelContextMethods;
};
