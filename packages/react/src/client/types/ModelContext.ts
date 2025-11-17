import type { Unsubscribe } from "@assistant-ui/tap";
import type { ModelContextProvider } from "../../model-context/ModelContextTypes";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type ModelContextState = {};

export type ModelContextApi = ModelContextProvider & {
  getState(): ModelContextState;
  register: (provider: ModelContextProvider) => Unsubscribe;
};

export type ModelContextMeta = {
  source: "root";
  query: Record<string, never>;
};
