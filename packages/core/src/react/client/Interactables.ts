import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { resource } from "@assistant-ui/tap";
import {
  useAssistantClientRef,
  type ClientOutput,
  attachTransformScopes,
} from "@assistant-ui/store";
import type {
  InteractablesState,
  InteractableRegistration,
  InteractablePersistedState,
  InteractablePersistenceAdapter,
  InteractablesConfig,
} from "../types/scopes/interactables";
import { toJSONSchema, toPartialJSONSchema } from "assistant-stream";
import { ModelContext } from "../../store";
import { buildInteractableModelContext } from "./interactable-model-context";
import {
  findModelKnownState,
  interactableToolName,
} from "../../model-context/interactable-composer-metadata";

const PERSISTENCE_DEBOUNCE_MS = 500;

type PartialJSONSchema = ReturnType<typeof toJSONSchema>;

const useInteractables = ({
  persistence,
}: InteractablesConfig = {}): ClientOutput<"interactables"> => {
  const [state, setState] = useState<InteractablesState>(() => ({
    definitions: {},
    persistence: {},
  }));

  const clientRef = useAssistantClientRef();

  const stateRef = useRef(state);

  const subscribersRef = useRef(new Set<() => void>());
  const partialSchemaCacheRef = useRef(new Map<string, PartialJSONSchema>());
  const detachedStateRef = useRef(new Map<string, unknown>());
  // An instance may be registered from several anchors (its creating tool
  // call plus update_* calls); the definition lives until the last one leaves.
  const registrationCountsRef = useRef(new Map<string, number>());
  // One update-tool UI per interactable name, alive while any registrant
  // that supplied an updateRender is mounted.
  const updateToolUIsRef = useRef(
    new Map<string, { count: number; unsubscribe: () => void }>(),
  );
  // App-scoped state restored via adapter.load(), consumed as components register.
  const loadedStateRef = useRef(new Map<string, unknown>());
  // Ids edited locally this session — a local edit always wins over a slow load.
  const touchedIdsRef = useRef(new Set<string>());

  const adapterRef = useRef<InteractablePersistenceAdapter | undefined>(
    undefined,
  );
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const syncSeqRef = useRef(0);
  const hasPendingLocalChangeRef = useRef(false);
  const flushResolversRef = useRef<Array<() => void>>([]);
  const dirtyIdsRef = useRef(new Set<string>());

  const setStateAndRef = useCallback(
    (updater: (prev: InteractablesState) => InteractablesState) => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  const runPersistence = useCallback(async () => {
    const adapter = adapterRef.current;
    if (!adapter) {
      for (const resolve of flushResolversRef.current) resolve();
      flushResolversRef.current = [];
      return;
    }

    const seq = ++syncSeqRef.current;
    const dirtyIds = new Set(dirtyIdsRef.current);
    dirtyIdsRef.current.clear();
    hasPendingLocalChangeRef.current = true;

    // Snapshot before any await so unregistered definitions are still included.
    const exported = stateRef.current.definitions;
    const payload: InteractablePersistedState = {};
    for (const [id, def] of Object.entries(exported)) {
      if (def.scope === "thread") continue; // thread items persist via snapshot, not the adapter
      payload[id] = { name: def.name, state: def.state };
    }

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
      if (syncSeqRef.current === seq) {
        hasPendingLocalChangeRef.current = false;
        setStateAndRef((prev) => {
          const persistence = { ...prev.persistence };
          for (const id of dirtyIds) delete persistence[id];
          return { ...prev, persistence };
        });
      }
    } catch (e) {
      if (syncSeqRef.current === seq) {
        hasPendingLocalChangeRef.current = false;
        setStateAndRef((prev) => ({
          ...prev,
          persistence: {
            ...prev.persistence,
            ...Object.fromEntries(
              [...dirtyIds].map((id) => [id, { isPending: false, error: e }]),
            ),
          },
        }));
      }
    } finally {
      if (dirtyIdsRef.current.size > 0 && adapterRef.current) {
        runPersistence();
      } else {
        for (const resolve of flushResolversRef.current) resolve();
        flushResolversRef.current = [];
      }
    }
  }, [setStateAndRef]);

  const schedulePersistence = useCallback(
    (id: string) => {
      if (!adapterRef.current) return;
      dirtyIdsRef.current.add(id);
      if (debounceTimerRef.current !== undefined) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        debounceTimerRef.current = undefined;
        if (!hasPendingLocalChangeRef.current) {
          runPersistence();
        } else {
          debounceTimerRef.current = setTimeout(() => {
            debounceTimerRef.current = undefined;
            runPersistence();
          }, PERSISTENCE_DEBOUNCE_MS);
        }
      }, PERSISTENCE_DEBOUNCE_MS);
    },
    [runPersistence],
  );

  const exportState = useCallback((): InteractablePersistedState => {
    const result: InteractablePersistedState = {};
    for (const [id, def] of Object.entries(stateRef.current.definitions)) {
      if (def.scope === "thread") continue; // thread items persist via snapshot, not the adapter
      result[id] = { name: def.name, state: def.state };
    }
    return result;
  }, []);

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
        if (!changed) return prev;
        return { ...prev, definitions };
      });
    },
    [setStateAndRef],
  );

  // Applies adapter.load() output: a local edit made while the load was in
  // flight wins, and thread-scoped items never restore from the adapter.
  const applyLoadedState = useCallback(
    (saved: InteractablePersistedState) => {
      for (const [id, entry] of Object.entries(saved)) {
        if (touchedIdsRef.current.has(id)) continue;
        loadedStateRef.current.set(id, entry.state);
      }
      setStateAndRef((prev) => {
        let changed = false;
        const definitions = { ...prev.definitions };
        for (const [id, entry] of Object.entries(saved)) {
          if (touchedIdsRef.current.has(id)) continue;
          const def = definitions[id];
          if (!def || def.scope === "thread") continue;
          definitions[id] = { ...def, state: entry.state };
          changed = true;
        }
        if (!changed) return prev;
        return { ...prev, definitions };
      });
    },
    [setStateAndRef],
  );

  const loadFromAdapter = useCallback(
    async (adapter: InteractablePersistenceAdapter) => {
      if (!adapter.load) return;
      try {
        const saved = await adapter.load();
        if (!saved || adapterRef.current !== adapter) return;
        applyLoadedState(saved);
      } catch (e) {
        console.warn("[Interactables] Persistence load failed.", e);
      }
    },
    [applyLoadedState],
  );

  const setPersistenceAdapter = useCallback(
    (adapter: InteractablePersistenceAdapter | undefined) => {
      adapterRef.current = adapter;
      if (adapter) void loadFromAdapter(adapter);
    },
    [loadFromAdapter],
  );

  useEffect(() => {
    if (!persistence) return;
    setPersistenceAdapter(persistence);
    return () => {
      if (adapterRef.current === persistence) {
        adapterRef.current = undefined;
      }
    };
  }, [persistence, setPersistenceAdapter]);

  const flush = useCallback(async () => {
    if (debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
    if (!adapterRef.current) return;
    if (!hasPendingLocalChangeRef.current && dirtyIdsRef.current.size === 0)
      return;
    const p = new Promise<void>((resolve) => {
      flushResolversRef.current.push(resolve);
    });
    if (!hasPendingLocalChangeRef.current) {
      runPersistence();
    }
    return p;
  }, [runPersistence]);

  const flushIfPending = useCallback(() => {
    if (adapterRef.current && debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
      runPersistence();
    }
  }, [runPersistence]);

  const setDefState = useCallback(
    (id: string, updater: (prev: unknown) => unknown) => {
      touchedIdsRef.current.add(id);
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

  useEffect(() => {
    return clientRef.current!.modelContext().register(provider);
  }, [clientRef, provider]);

  const register = useCallback(
    (def: InteractableRegistration) => {
      if (
        process.env.NODE_ENV !== "production" &&
        stateRef.current.definitions[def.id] &&
        def.scope !== "thread"
      ) {
        console.warn(
          `[Interactables] "${def.name}" (${def.id}) is already registered. ` +
            `Register an app-scoped interactable once (useInteractable) and ` +
            `read it from other components with useInteractableState.`,
        );
      }

      registrationCountsRef.current.set(
        def.id,
        (registrationCountsRef.current.get(def.id) ?? 0) + 1,
      );

      let releaseUpdateToolUI: (() => void) | undefined;
      if (def.updateRender) {
        const toolsAccessor = clientRef.current?.tools;
        if (toolsAccessor && toolsAccessor.source != null) {
          const toolName = interactableToolName(def.name);
          const existing = updateToolUIsRef.current.get(def.name);
          if (existing) {
            existing.count++;
          } else {
            updateToolUIsRef.current.set(def.name, {
              count: 1,
              unsubscribe: toolsAccessor().setToolUI(
                toolName,
                def.updateRender,
                { standalone: true },
              ),
            });
          }
          releaseUpdateToolUI = () => {
            const entry = updateToolUIsRef.current.get(def.name);
            if (!entry) return;
            if (--entry.count === 0) {
              updateToolUIsRef.current.delete(def.name);
              entry.unsubscribe();
            }
          };
        } else if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[Interactables] "${def.name}" supplied an updateRender, but no ` +
              `tools scope is available to install it into.`,
          );
        }
      }

      try {
        const jsonSchema = toJSONSchema(def.stateSchema);
        partialSchemaCacheRef.current.set(
          def.id,
          toPartialJSONSchema(jsonSchema),
        );
      } catch (e) {
        console.warn(
          `[Interactables] Failed to create partial schema for "${def.name}". The update tool will accept arbitrary fields without validation.`,
          e,
        );
      }

      const detached = detachedStateRef.current.get(def.id);
      detachedStateRef.current.delete(def.id);
      const loaded =
        def.scope === "thread" ? undefined : loadedStateRef.current.get(def.id);

      // Thread-scoped items restore from what the model already knows in this
      // thread (latest snapshot + the model's own update_* calls) on a fresh
      // reload; detached (in-session remount) still wins so an unsent edit
      // survives a scroll/virtualization cycle. The thread accessor throws
      // when no thread scope is in context, so guard it.
      const threadAccessor = clientRef.current?.thread;
      const known =
        def.scope === "thread" &&
        threadAccessor &&
        threadAccessor.source != null
          ? findModelKnownState(
              threadAccessor().getState().messages ?? [],
              def.id,
              def.name,
            )
          : undefined;

      setStateAndRef((prev) => ({
        ...prev,
        definitions: {
          ...prev.definitions,
          [def.id]: {
            id: def.id,
            name: def.name,
            description: def.description,
            stateSchema: def.stateSchema,
            initialState: def.initialState,
            scope: def.scope,
            state:
              prev.definitions[def.id]?.state ??
              detached ??
              (known ? known.state : undefined) ??
              loaded ??
              def.initialState,
          },
        },
      }));

      return () => {
        releaseUpdateToolUI?.();

        const remaining = (registrationCountsRef.current.get(def.id) ?? 1) - 1;
        if (remaining > 0) {
          registrationCountsRef.current.set(def.id, remaining);
          return;
        }
        registrationCountsRef.current.delete(def.id);

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
    [flushIfPending, clientRef, setStateAndRef],
  );

  return {
    getState: () => stateRef.current,
    register,
    setState: setDefState,
    exportState,
    importState,
    setPersistenceAdapter,
    flush,
  };
};

export const Interactables = resource(useInteractables);

attachTransformScopes(useInteractables, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
