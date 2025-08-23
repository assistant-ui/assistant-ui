"use client";
import {
  AssistantState,
  AssistantApi,
  AssistantActions,
  useAssistantApi,
} from "../AssistantContext";
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
    public readonly store: AssistantApi,
    selectors: Omit<Selectors, "meta">,
  ) {
    Object.entries(selectors).forEach(([propName, selector]) => {
      Object.defineProperty(this, propName, {
        get() {
          return selector.state(this);
        },
      });
    });
  }

  get threads() {
    return this.store.getState().threads;
  }

  get toolUIs() {
    return this.store.getState().toolUIs;
  }

  get threadListItem() {
    return this.store.getState().threadListItem;
  }

  get thread() {
    return this.store.getState().thread;
  }

  get composer() {
    return this.store.getState().composer;
  }

  get message() {
    const message = this.store.getState().message;
    if (!message)
      throw new Error(
        "No message context available. You can only access message context inside <ThreadPrimitive.Messages>",
      );
    return this.store.getState().message;
  }

  get part() {
    return this.store.getState().part;
  }

  get attachment() {
    return this.store.getState().attachment;
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
    store as AssistantApi,
    selectors,
  );
  const getState = () => stateProxy;

  const actions = Object.create(store.actions);
  Object.entries(selectors).forEach(([propName, selector]) => {
    if (propName === "meta") return;
    Object.defineProperty(actions, propName, {
      get() {
        return selector.action(actions, getState);
      },
    });
  });

  return {
    getState,
    subscribe: store.subscribe,
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
