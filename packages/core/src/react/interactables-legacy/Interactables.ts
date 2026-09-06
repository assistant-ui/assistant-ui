import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { resource } from "@assistant-ui/tap";
import {
  useAssistantClientRef,
  type ClientOutput,
  attachTransformScopes,
} from "@assistant-ui/store";
import { useAssistantScopeEffect } from "@assistant-ui/store/client";
import type {
  InteractablesState,
  InteractableRegistration,
  InteractableStateSchema,
  InteractablePersistedState,
  InteractablePersistenceAdapter,
} from "./scopes";
import { toJSONSchema, toPartialJSONSchema } from "assistant-stream";
import { ModelContext } from "../../store";
import { buildInteractableModelContext } from "./interactable-model-context";
import { notifySubscribers as notifyStateSubscribers } from "../../subscribable/subscribable";
import { useInteractablePersistenceQueue } from "../interactables-shared/useInteractablePersistenceQueue";
import { nullProtoRecord } from "../../utils/record";

const useInteractables = (): ClientOutput<"interactables"> => {
  const [state, setState] = useState<InteractablesState>(() => ({
    definitions: nullProtoRecord(),
    persistence: nullProtoRecord(),
  }));

  const clientRef = useAssistantClientRef();

  const stateRef = useRef(state);

  const setStateAndRef = useCallback(
    (updater: (prev: InteractablesState) => InteractablesState) => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  const subscribersRef = useRef(new Set<() => void>());
  const partialSchemaCacheRef = useRef(
    new Map<string, InteractableStateSchema>(),
  );
  const detachedStateRef = useRef(new Map<string, unknown>());

  const adapterRef = useRef<InteractablePersistenceAdapter | undefined>(
    undefined,
  );

  const exportState = useCallback((): InteractablePersistedState => {
    const result = nullProtoRecord<InteractablePersistedState[string]>();
    for (const [id, def] of Object.entries(stateRef.current.definitions)) {
      result[id] = { name: def.name, state: def.state };
    }
    return result;
  }, []);

  const updatePersistenceStatus = useCallback(
    (
      updater: (
        prev: InteractablesState["persistence"],
      ) => InteractablesState["persistence"],
    ) => {
      setStateAndRef((prev) => {
        const persistence = updater(prev.persistence);
        return persistence === prev.persistence
          ? prev
          : { ...prev, persistence };
      });
    },
    [setStateAndRef],
  );

  const { flushIfPending, schedulePersistence, flush } =
    useInteractablePersistenceQueue({
      adapterRef,
      snapshot: exportState,
      updatePersistenceStatus,
    });

  const importState = useCallback(
    (saved: InteractablePersistedState) => {
      for (const [id, entry] of Object.entries(saved)) {
        detachedStateRef.current.set(id, entry.state);
      }
      setStateAndRef((prev) => {
        let changed = false;
        const definitions = nullProtoRecord(prev.definitions);
        for (const [id, entry] of Object.entries(saved)) {
          if (definitions[id]) {
            definitions[id] = { ...definitions[id], state: entry.state };
            changed = true;
          }
        }
        return changed ? { ...prev, definitions } : prev;
      });
    },
    [setStateAndRef],
  );

  const setPersistenceAdapter = useCallback(
    (adapter: InteractablePersistenceAdapter | undefined) => {
      if (adapterRef.current !== adapter) flushIfPending();
      adapterRef.current = adapter;
    },
    [flushIfPending],
  );

  const setDefState = useCallback(
    (id: string, updater: (prev: unknown) => unknown) => {
      setStateAndRef((prev) => {
        const existing = prev.definitions[id];
        if (!existing) return prev;
        return {
          ...prev,
          definitions: nullProtoRecord(prev.definitions, {
            [id]: { ...existing, state: updater(existing.state) },
          }),
        };
      });
      if (stateRef.current.definitions[id]) schedulePersistence(id);
    },
    [schedulePersistence, setStateAndRef],
  );

  const setDefSelected = useCallback(
    (id: string, selected: boolean) => {
      setStateAndRef((prev) => {
        const existing = prev.definitions[id];
        if (!existing) return prev;
        return {
          ...prev,
          definitions: nullProtoRecord(prev.definitions, {
            [id]: { ...existing, selected },
          }),
        };
      });
    },
    [setStateAndRef],
  );

  const provider = useMemo(
    () => ({
      getModelContext: () => {
        const defs = stateRef.current.definitions;
        return (
          buildInteractableModelContext(
            defs,
            partialSchemaCacheRef.current,
            setDefState,
          ) ?? {}
        );
      },
      subscribe: (callback: () => void) => {
        subscribersRef.current.add(callback);
        return () => {
          subscribersRef.current.delete(callback);
        };
      },
    }),
    [setDefState],
  );

  useEffect(() => {
    notifyStateSubscribers(subscribersRef.current);
  }, [state]);

  useAssistantScopeEffect(
    "modelContext",
    () => clientRef.current!.modelContext().register(provider),
    [provider],
  );

  const register = useCallback(
    (def: InteractableRegistration) => {
      try {
        const jsonSchema = toJSONSchema(def.stateSchema);
        partialSchemaCacheRef.current.set(
          def.id,
          toPartialJSONSchema(jsonSchema),
        );
      } catch (e) {
        console.warn(
          `[Interactables] Failed to create partial schema for "${def.name}". The update tool will require all fields.`,
          e,
        );
      }

      const detached = detachedStateRef.current.get(def.id);
      detachedStateRef.current.delete(def.id);

      setStateAndRef((prev) => ({
        ...prev,
        definitions: nullProtoRecord(prev.definitions, {
          [def.id]: {
            id: def.id,
            name: def.name,
            description: def.description,
            stateSchema: def.stateSchema,
            state:
              prev.definitions[def.id]?.state ?? detached ?? def.initialState,
            selected: def.selected,
          },
        }),
      }));

      return () => {
        flushIfPending();
        setStateAndRef((prev) => {
          const existing = prev.definitions[def.id];
          if (existing) {
            detachedStateRef.current.set(def.id, existing.state);
          }
          partialSchemaCacheRef.current.delete(def.id);
          const definitions = nullProtoRecord(prev.definitions);
          const persistence = nullProtoRecord(prev.persistence);
          delete definitions[def.id];
          delete persistence[def.id];
          return { ...prev, definitions, persistence };
        });
      };
    },
    [flushIfPending, setStateAndRef],
  );

  return {
    getState: () => state,
    register,
    setState: setDefState,
    setSelected: setDefSelected,
    exportState,
    importState,
    setPersistenceAdapter,
    flush,
  };
};

/**
 * @deprecated Since 2026-06-14 — migrate to the Unstable / Experimental API.
 * Scheduled for removal on/after 2026-09-14. See
 * {@link https://www.assistant-ui.com/docs/tools/interactables#migrating-from-the-previous-api | Interactables migration guide}.
 */
export const Interactables = resource(useInteractables);

attachTransformScopes(useInteractables, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
