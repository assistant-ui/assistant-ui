import {
  createResourceContext,
  tap,
  withContextProvider,
} from "@assistant-ui/tap";
import { ModelContextProvider } from "../model-context/ModelContextTypes";
import { Unsubscribe } from "../types";

export type ModelContextRegistrar = ModelContextProvider & {
  register: (provider: ModelContextProvider) => Unsubscribe;
};

const ModelContextContext = createResourceContext<ModelContextRegistrar | null>(
  null,
);

export const withModelContextProvider = <TResult>(
  modelContext: ModelContextRegistrar,
  fn: () => TResult,
) => {
  return withContextProvider(ModelContextContext, modelContext, fn);
};

export const tapModelContext = () => {
  const modelContext = tap(ModelContextContext);
  if (!modelContext)
    throw new Error("Model context is not available in this context");

  return modelContext;
};
