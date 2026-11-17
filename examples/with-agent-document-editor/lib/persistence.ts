import type { Unstable_InteractablePersistenceAdapter } from "@assistant-ui/react";

const STORAGE_KEY = "with-agent-document-editor:document:v5";

export const documentPersistence: Unstable_InteractablePersistenceAdapter = {
  load: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : undefined;
    } catch {
      return undefined;
    }
  },
  save: (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};
