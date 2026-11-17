import type {
  Unstable_InteractablePersistedState,
  Unstable_InteractablePersistenceAdapter,
} from "@assistant-ui/react";
import {
  COMMENTS_ID,
  commentsSchema,
  DOCUMENT_ID,
  documentSchema,
} from "./document-state";

const STORAGE_KEY = "with-agent-document-editor:document:v5";

const isValidState = (id: string, state: unknown) => {
  if (id === DOCUMENT_ID) return documentSchema.safeParse(state).success;
  if (id === COMMENTS_ID) return commentsSchema.safeParse(state).success;
  return true;
};

/**
 * What was saved, without any entry the app could not render. A dropped
 * entry starts again from its initial state.
 */
export function readSaved(
  saved: string | null,
): Unstable_InteractablePersistedState | undefined {
  if (!saved) return undefined;
  const parsed: unknown = JSON.parse(saved);
  if (!parsed || typeof parsed !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(parsed).filter(
      ([id, entry]) =>
        !!entry &&
        typeof entry === "object" &&
        typeof entry.name === "string" &&
        isValidState(id, entry.state),
    ),
  );
}

export const documentPersistence: Unstable_InteractablePersistenceAdapter = {
  load: () => readSaved(localStorage.getItem(STORAGE_KEY)),
  save: (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};
