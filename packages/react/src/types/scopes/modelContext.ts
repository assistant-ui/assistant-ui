import type { Unsubscribe } from "../Unsubscribe";
import type { ModelContextProvider } from "../../model-context/ModelContextTypes";

export type ModelContextState = Record<string, never>;

export type ModelContextMethods = ModelContextProvider & {
  getState(): ModelContextState;
  register: (provider: ModelContextProvider) => Unsubscribe;
};

export type ModelContextClientSchema = {
  methods: ModelContextMethods;
};
