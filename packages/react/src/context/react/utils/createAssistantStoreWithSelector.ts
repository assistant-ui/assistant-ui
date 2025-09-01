"use client";
import {
  AssistantState,
  AssistantApi,
  AssistantActions,
  useAssistantApi,
} from "../AssistantApiContext";
import { useMemo } from "react";
import { Store } from "../../../utils/tap-store";

type SelectorKey = keyof AssistantState; // TODO: fix this
type SelectorConfig<K extends SelectorKey> = {
  state: (state: AssistantState) => AssistantState[K];
  action: (
    actions: AssistantActions,
    getState: () => AssistantState,
  ) => AssistantActions[K];
};

type Selectors = { [K in SelectorKey]?: SelectorConfig<K> } & {
  meta: Partial<AssistantApi["meta"]>;
};

class ProxiedAssistantState implements AssistantState {
  constructor(
    public readonly getState: () => AssistantState,
    selectors: Omit<Selectors, "meta">,
  ) {
    Object.entries(selectors).forEach(([propName, selector]) => {
      let lastValue = selector.state(this);
      if (lastValue === undefined)
        throw new Error(
          `Selector ${propName} returned undefined. Please check your selector.`,
        );

      Object.defineProperty(this, propName, {
        enumerable: true,
        get() {
          const value = selector.state(this) ?? lastValue;
          lastValue = value;
          return value;
        },
      });
    });
  }

  get threads() {
    return this.getState().threads;
  }

  get toolUIs() {
    return this.getState().toolUIs;
  }

  get threadListItem() {
    return this.getState().threadListItem;
  }

  get thread() {
    return this.getState().thread;
  }

  get composer() {
    return this.getState().composer;
  }

  get message() {
    return this.getState().message;
  }

  get part() {
    return this.getState().part;
  }

  get attachment() {
    return this.getState().attachment;
  }
}

export const createAssistantStoreWithSelector = <T extends Selectors>(
  store: Store<
    Omit<AssistantState, keyof T>,
    Omit<AssistantActions, keyof T>
  > & { meta?: AssistantApi["meta"] },
  { meta, ...selectors }: T,
): AssistantApi => {
  const stateProxy = new ProxiedAssistantState(
    store.getState as () => AssistantState,
    selectors,
  );
  const initialState = store.getState();
  const initialStateProxy = new ProxiedAssistantState(
    () => initialState as AssistantState,
    selectors,
  );
  const getState = () => stateProxy;

  const actions = Object.create(store.actions);
  Object.entries(selectors).forEach(([propName, selector]) => {
    if (propName === "meta") return;
    actions[propName] = selector.action(actions, getState);
  });

  return {
    getState,
    getInitialState: () => initialStateProxy,
    subscribe: store.subscribe,
    flushSync: store.flushSync,
    actions,
    meta: {
      ...store.meta!,
      ...meta,
    },
  };
};

export const useAssistantStoreWithSelector = <T extends Selectors>(
  selectors: T,
) => {
  const store = useAssistantApi();

  return useMemo(
    () => createAssistantStoreWithSelector(store, selectors),
    [store, selectors],
  );
};
