import { createStore, type StoreApi } from "zustand/vanilla";
import { replaceOnce, type DocumentEditResult } from "./document";

export type DocumentState = {
  /** The document as Markdown, the form the assistant reads and writes. */
  content: string;
  /** The text the user has selected in the editor, or "" when nothing is. */
  selection: string;

  setContent: (content: string) => void;
  /** Replaces the single occurrence of `find`, or reports why it cannot. */
  edit: (find: string, replace: string) => DocumentEditResult;
  setSelection: (selection: string) => void;
};

export type DocumentStore = StoreApi<DocumentState>;

export function createDocumentStore(initialContent = ""): DocumentStore {
  return createStore<DocumentState>()((set, get) => ({
    content: initialContent,
    selection: "",

    setContent: (content) => {
      if (content !== get().content) set({ content });
    },

    edit: (find, replace) => {
      const result = replaceOnce(get().content, find, replace);
      if (result.ok) get().setContent(result.content);
      return result;
    },

    setSelection: (selection) => {
      if (selection !== get().selection) set({ selection });
    },
  }));
}
