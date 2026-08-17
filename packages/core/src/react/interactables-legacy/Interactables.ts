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

const PERSISTENCE_DEBOUNCE_MS = 500;

const useInteractables = (): ClientOutput<"interactables"> => {
  const [state, setState] = useState<InteractablesState>(() => ({
    definitions: {},
    persistence: {},
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
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const syncSeqRef = useRef(0);
  const latestSyncSeqByIdRef = useRef(new Map<string, number>());
  const inFlightPersistenceRef = useRef(0);
  const flushResolversRef = useRef<Array<() => void>>([]);
  const dirtyIdsRef = useRef(new Set<string>());

  type PersistenceBatch = {
    adapter: InteractablePersistenceAdapter;
    payload: InteractablePersistedState;
    dirtyIds: Set<string>;
    seq: number;
  };

  const outgoingQueueRef = useRef<PersistenceBatch[]>([]);
  const runPersistenceRef = useRef<(batch?: PersistenceBatch) => void>(
    () => {},
  );

  const exportState = useCallback((): InteractablePersistedState => {
    const result: InteractablePersistedState = {};
    for (const [id, def] of Object.entries(stateRef.current.definitions)) {
      result[id] = { name: def.name, state: def.state };
    }
    return result;
  }, []);

  const takeDirtyBatch = useCallback(
    (adapter: InteractablePersistenceAdapter): PersistenceBatch | undefined => {
      if (dirtyIdsRef.current.size === 0) return;
      const dirtyIds = new Set(dirtyIdsRef.current);
      dirtyIdsRef.current.clear();
      const seq = ++syncSeqRef.current;
      for (const id of dirtyIds) latestSyncSeqByIdRef.current.set(id, seq);
      return { adapter, payload: exportState(), dirtyIds, seq };
    },
    [exportState],
  );

  const enqueuePersistence = useCallback(
    (adapter: InteractablePersistenceAdapter) => {
      const batch = takeDirtyBatch(adapter);
      if (!batch) return;
      if (inFlightPersistenceRef.current === 0) {
        runPersistenceRef.current(batch);
      } else {
        outgoingQueueRef.current.push(batch);
      }
    },
    [takeDirtyBatch],
  );

  const runPersistence = useCallback(
    async (batch?: PersistenceBatch) => {
      const resolved =
        batch ??
        (adapterRef.current ? takeDirtyBatch(adapterRef.current) : undefined);
      if (!resolved) {
        if (inFlightPersistenceRef.current === 0) {
          for (const resolve of flushResolversRef.current) resolve();
          flushResolversRef.current = [];
        }
        return;
      }

      const { adapter, payload, dirtyIds, seq } = resolved;
      inFlightPersistenceRef.current += 1;

      setStateAndRef((prev) => ({
        ...prev,
        persistence: {
          ...prev.persistence,
          ...Object.fromEntries(
            [...dirtyIds].map((id) => [
              id,
              { isPending: true, error: undefined },
            ]),
          ),
        },
      }));

      try {
        await adapter.save(payload);
        setStateAndRef((prev) => {
          let changed = false;
          const persistence = { ...prev.persistence };
          for (const id of dirtyIds) {
            if (
              latestSyncSeqByIdRef.current.get(id) !== seq ||
              dirtyIdsRef.current.has(id)
            )
              continue;
            latestSyncSeqByIdRef.current.delete(id);
            delete persistence[id];
            changed = true;
          }
          return changed ? { ...prev, persistence } : prev;
        });
      } catch (e) {
        setStateAndRef((prev) => {
          let changed = false;
          const persistence = { ...prev.persistence };
          for (const id of dirtyIds) {
            if (
              latestSyncSeqByIdRef.current.get(id) !== seq ||
              dirtyIdsRef.current.has(id)
            )
              continue;
            latestSyncSeqByIdRef.current.delete(id);
            persistence[id] = { isPending: false, error: e };
            changed = true;
          }
          return changed ? { ...prev, persistence } : prev;
        });
      } finally {
        inFlightPersistenceRef.current -= 1;
        const next =
          outgoingQueueRef.current.shift() ??
          (adapterRef.current && dirtyIdsRef.current.size > 0
            ? takeDirtyBatch(adapterRef.current)
            : undefined);
        if (next) {
          if (debounceTimerRef.current !== undefined) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = undefined;
          }
          runPersistenceRef.current(next);
        } else if (inFlightPersistenceRef.current === 0) {
          for (const resolve of flushResolversRef.current) resolve();
          flushResolversRef.current = [];
        }
      }
    },
    [setStateAndRef, takeDirtyBatch],
  );
  runPersistenceRef.current = (nextBatch) => {
    void runPersistence(nextBatch);
  };

  const schedulePersistence = useCallback(
    (id: string) => {
      if (!adapterRef.current) return;
      dirtyIdsRef.current.add(id);
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = undefined;
        if (inFlightPersistenceRef.current === 0 && adapterRef.current) {
          enqueuePersistence(adapterRef.current);
        } else {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = undefined;
            if (adapterRef.current) enqueuePersistence(adapterRef.current);
          }, PERSISTENCE_DEBOUNCE_MS);
        }
      }, PERSISTENCE_DEBOUNCE_MS);
    },
    [enqueuePersistence],
  );

  const importState = useCallback(
    (saved: InteractablePersistedState) => {
      for (const [id, entry] of Object.entries(saved)) {
        detachedStateRef.current.set(id, entry.state);
      }
      setStateAndRef((prev) => {
        let changed = false;
        const definitions = { ...prev.definitions };
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

  const flushIfPending = useCallback(() => {
    if (debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
    if (adapterRef.current) enqueuePersistence(adapterRef.current);
  }, [enqueuePersistence]);

  const flush = useCallback(async () => {
    if (debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
    const hasWork =
      inFlightPersistenceRef.current > 0 ||
      dirtyIdsRef.current.size > 0 ||
      outgoingQueueRef.current.length > 0;
    if (!hasWork) return;
    const p = new Promise<void>((resolve) => {
      flushResolversRef.current.push(resolve);
    });
    if (adapterRef.current) enqueuePersistence(adapterRef.current);
    return p;
  }, [enqueuePersistence]);

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
          definitions: {
            ...prev.definitions,
            [id]: { ...existing, state: updater(existing.state) },
          },
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
          definitions: {
            ...prev.definitions,
            [id]: { ...existing, selected },
          },
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
    for (const cb of subscribersRef.current) cb();
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
        definitions: {
          ...prev.definitions,
          [def.id]: {
            id: def.id,
            name: def.name,
            description: def.description,
            stateSchema: def.stateSchema,
            state:
              prev.definitions[def.id]?.state ?? detached ?? def.initialState,
            selected: def.selected,
          },
        },
      }));

      return () => {
        flushIfPending();
        setStateAndRef((prev) => {
          const existing = prev.definitions[def.id];
          if (existing) {
            detachedStateRef.current.set(def.id, existing.state);
          }
          partialSchemaCacheRef.current.delete(def.id);
          const { [def.id]: _, ...rest } = prev.definitions;
          const { [def.id]: __, ...restPersistence } = prev.persistence;
          return { ...prev, definitions: rest, persistence: restPersistence };
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
