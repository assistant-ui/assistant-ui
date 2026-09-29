import {
  inject,
  provide,
  shallowRef,
  type InjectionKey,
  type ShallowRef,
} from "vue";

type ThreadListCollection = {
  registerTrigger: (key: symbol, trigger: HTMLButtonElement) => () => void;
  getTriggers: () => HTMLButtonElement[];
};

type ThreadListItemFocus = {
  trigger: ShallowRef<HTMLButtonElement | null>;
};

const threadListCollectionKey: InjectionKey<ThreadListCollection> = Symbol(
  "assistant-ui.vue.thread-list-collection",
);

const threadListItemFocusKey: InjectionKey<ThreadListItemFocus> = Symbol(
  "assistant-ui.vue.thread-list-item-focus",
);

export const provideThreadListCollection = () => {
  const triggers = new Map<symbol, HTMLButtonElement>();
  const collection: ThreadListCollection = {
    registerTrigger: (key, trigger) => {
      triggers.set(key, trigger);
      return () => {
        if (triggers.get(key) === trigger) triggers.delete(key);
      };
    },
    getTriggers: () =>
      [...triggers.values()].sort((first, second) => {
        const position = first.compareDocumentPosition(second);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      }),
  };
  provide(threadListCollectionKey, collection);
};

export const useThreadListCollection = () =>
  inject(threadListCollectionKey, null);

export const provideThreadListItemFocus = (): ThreadListItemFocus => {
  const focus = { trigger: shallowRef<HTMLButtonElement | null>(null) };
  provide(threadListItemFocusKey, focus);
  return focus;
};

export const useThreadListItemFocus = () =>
  inject(threadListItemFocusKey, null);
