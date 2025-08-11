import { useContext, Context } from "react";
import { Store } from "../tap-store";

export type StoreApi<TState> = {
  getState: () => TState;
  subscribe: (callback: () => void) => () => void;
};

export function createStoreApiHook<TState>(
  context: Context<Store<TState, any> | undefined>
) {
  function useStoreApi(): StoreApi<TState>;
  function useStoreApi(options: { optional?: false | undefined }): StoreApi<TState>;
  function useStoreApi(options: { optional?: boolean | undefined }): StoreApi<TState> | null;
  
  function useStoreApi(options?: { optional?: boolean | undefined }): StoreApi<TState> | null {
    const store = useContext(context);
    
    if (!store) {
      if (options?.optional) return null;
      throw new Error(
        "Store context is not available. This hook must be used within the appropriate provider."
      );
    }
    
    return {
      getState: store.getState,
      subscribe: store.subscribe,
    };
  }
  
  return useStoreApi;
}