import { useEffect, useInsertionEffect, useState } from "react";
import { ExternalStoreRuntime } from "./ExternalStoreRuntime";
import { ExternalStoreAdapter } from "./ExternalStoreAdapter";

export const useExternalStoreRuntime = (store: ExternalStoreAdapter<any>) => {
  const [runtime] = useState(() => new ExternalStoreRuntime(store));

  useInsertionEffect(() => {
    runtime.store = store;
  });
  useEffect(() => {
    runtime.onStoreUpdated();
  });

  return runtime;
};
