"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useStore } from "zustand";
import {
  createDocumentStore,
  type DocumentState,
  type DocumentStore,
} from "@/lib/document-editor/document-store";
import { createDocumentToolkit } from "@/lib/document-editor/document-toolkit";

export const DocumentStoreContext = createContext<DocumentStore | null>(null);

/**
 * Creates the document store for one editor and the toolkit bound to it. Pass
 * the toolkit to the runtime provider and the store to `DocumentStoreContext`.
 */
export function useDocumentEditor(initialContent?: string) {
  const [store] = useState(() => createDocumentStore(initialContent));
  const toolkit = useMemo(() => createDocumentToolkit(store), [store]);
  return { store, toolkit };
}

export function useDocumentStore(): DocumentStore {
  const store = useContext(DocumentStoreContext);
  if (!store) {
    throw new Error(
      "useDocument must be used inside a DocumentStoreContext provider.",
    );
  }
  return store;
}

export function useDocument<T>(selector: (state: DocumentState) => T): T {
  return useStore(useDocumentStore(), selector);
}
