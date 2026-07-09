"use client";

import { createCollection } from "@radix-ui/react-collection";
import { createContext, useContext, type RefObject } from "react";

const [collection, useThreadListCollection] =
  createCollection<HTMLButtonElement>("ThreadList");

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
