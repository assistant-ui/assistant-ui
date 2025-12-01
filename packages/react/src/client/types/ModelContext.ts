import type { Unsubscribe } from "../../types";
import type { ModelContextProvider } from "../../model-context/ModelContextTypes";

export type ModelContextState = {};

export type ModelContextApi = ModelContextProvider & {
  getState(): ModelContextState;
  register: (provider: ModelContextProvider) => Unsubscribe;
};

export type ModelContextMeta = {
  source: "root";
  query: Record<string, never>;
};
