import {
  FC,
  PropsWithChildren,
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useSyncExternalStoreWithSelector } from "use-sync-external-store/with-selector";

type Store<State> = {
  subscribe: (callback: () => void) => () => void;
  emit: () => void;
  snapshot: () => State;
  setState: (value: State) => void;
};

export const createStoreContext = <T extends Record<string, unknown>>(
  providerName: string,
) => {
  const context = createContext<Store<T> | null>(null);
  const StoreProvider: FC<PropsWithChildren<T>> = ({ children, ...rest }) => {
    const unstableContext = rest as T;
    const [store] = useState<Store<T>>(() => {
      let state = unstableContext;
      const listeners = new Set<() => void>();
      return {
        subscribe: (cb) => {
          listeners.add(cb);
          return () => listeners.delete(cb);
        },
        emit: () => {
          listeners.forEach((l) => l());
        },
        snapshot: () => {
          return state;
        },
        setState: (value) => {
          state = value;
          store.emit();
        },
      };
    });

    // Update state when values change
    useMemo(
      () => store.setState(unstableContext),
      Object.values(unstableContext),
    );

    return <context.Provider value={store}>{children}</context.Provider>;
  };
  const useStoreContext = <Selection,>(
    consumerName: string,
    selector: (s: T) => Selection,
  ) => {
    const store = useContext(context);
    if (!store)
      throw new Error(
        `${consumerName} can only be used inside ${providerName}.`,
      );

    return useSyncExternalStoreWithSelector(
      store.subscribe,
      store.snapshot,
      store.snapshot,
      selector,
    );
  };

  return [StoreProvider, useStoreContext] as const;
};
