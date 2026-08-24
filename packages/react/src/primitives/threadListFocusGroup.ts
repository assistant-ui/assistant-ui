"use client";

import { Collection } from "radix-ui/internal";
import { createContext, useContext, type RefObject } from "react";

const [collection, useThreadListCollection] =
  Collection.createCollection<HTMLButtonElement>("ThreadList");

export const ThreadListCollection = collection;
export { useThreadListCollection };

type ThreadListItemFocus = {
  triggerRef: RefObject<HTMLButtonElement | null>;
  moreRef: RefObject<HTMLButtonElement | null>;
};

const ThreadListItemFocusContext = createContext<ThreadListItemFocus | null>(
  null,
);

export const ThreadListItemFocusProvider = ThreadListItemFocusContext.Provider;

export const useThreadListItemFocus = (): ThreadListItemFocus | null =>
  useContext(ThreadListItemFocusContext);
