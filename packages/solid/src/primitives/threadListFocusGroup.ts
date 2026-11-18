import { createContext, useContext } from "solid-js";

type ThreadListCollection = {
  registerTrigger: (key: symbol, trigger: HTMLButtonElement) => () => void;
  getTriggers: () => HTMLButtonElement[];
};

export const ThreadListCollectionContext =
  createContext<ThreadListCollection>();

export const ThreadListItemFocusContext = createContext<{
  trigger: HTMLButtonElement | null;
}>();

export const createThreadListCollection = (): ThreadListCollection => {
  const triggers = new Map<symbol, HTMLButtonElement>();
  return {
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
};

export const useThreadListCollection = () =>
  useContext(ThreadListCollectionContext);

export const useThreadListItemFocus = () =>
  useContext(ThreadListItemFocusContext);
