import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { resource } from "@assistant-ui/tap";
import type { ClientOutput } from "@assistant-ui/store";
import {
  attachTransformScopes,
  useAssistantClientRef,
  useAssistantScopeEffect,
} from "@assistant-ui/store/client";
import type {
  Unstable_InteractablesState,
  Unstable_InteractableRegistration,
  Unstable_InteractablePersistedState,
  Unstable_InteractablePersistenceAdapter,
  Unstable_InteractablesConfig,
} from "../types/scopes/interactables";
import { toJSONSchema, toPartialJSONSchema } from "assistant-stream";
import { ModelContext } from "../../store/clients/model-context-client";
import {
  buildInteractableModelContext,
  type PartialJSONSchema,
} from "./interactable-model-context";
import {
  findModelKnownState,
  interactableToolName,
} from "../../model-context/interactable-composer-metadata";
import { notifySubscribers as notifyStateSubscribers } from "../../subscribable/subscribable";

const PERSISTENCE_DEBOUNCE_MS = 500;

type RestorePersistedStateOptions = {
  stash: Map<string, unknown>;
  shouldStash?: (id: string) => boolean;
  shouldApply?: (
    id: string,
    def: Unstable_InteractablesState["definitions"][string],
  ) => boolean;
};

type ToolCallLikePart = {
  type?: string;
  toolCallId?: string;
  toolName?: string;
};

type MessageLike = {
  role?: string;
  content?: readonly unknown[] | undefined;
};

type InternalInteractableRegistration = Unstable_InteractableRegistration & {
  scope?: "thread" | undefined;
};

type UpdateToolUIEntry = {
  count: number;
  render: NonNullable<Unstable_InteractableRegistration["updateRender"]>;
  unsubscribe: (() => void) | undefined;
};

const hasInteractableCreateCall = (
  messages: readonly MessageLike[],
  id: string,
  name: string,
) =>
  messages.some(
    (message) =>
      message.role === "assistant" &&
      message.content?.some((part) => {
        if (!part || typeof part !== "object") return false;
        const p = part as ToolCallLikePart;
        return (
          p.type === "tool-call" && p.toolCallId === id && p.toolName === name
        );
      }),
  );

const useInteractablesResource = ({
  persistence,
}: Unstable_InteractablesConfig = {}): ClientOutput<"unstable_interactables"> => {
  const [state, setState] = useState<Unstable_InteractablesState>(() => ({
    definitions: {},
    persistence: {},
  }));

  const clientRef = useAssistantClientRef();

  const stateRef = useRef(state);

  const subscribersRef = useRef(new Set<() => void>());
  const partialSchemaCacheRef = useRef(new Map<string, PartialJSONSchema>());
  const streamBaselinesRef = useRef(
    new Map<string, { targetId: string; state: unknown }>(),
  );
  const detachedAppStateRef = useRef(new Map<string, unknown>());
  const detachedThreadStateRef = useRef(
    new Map<string, Map<string, unknown>>(),
  );
  // An instance may be registered from several anchors (its creating tool
  // call plus update_* calls); the definition lives until the last one leaves.
  const registrationCountsRef = useRef(new Map<string, number>());
  // One update-tool UI per interactable name, alive while any registrant
  // that supplied an updateRender is mounted.
  const updateToolUIsRef = useRef(new Map<string, UpdateToolUIEntry>());
  // App-scoped state restored via adapter.load(), consumed as components register.
  const loadedStateRef = useRef(new Map<string, unknown>());
  // Ids edited locally this session — a local edit always wins over a slow load.
  const touchedIdsRef = useRef(new Set<string>());

  const adapterRef = useRef<
    Unstable_InteractablePersistenceAdapter | undefined
  >(undefined);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const syncSeqRef = useRef(0);
  const latestSyncSeqByIdRef = useRef(new Map<string, number>());
  const inFlightPersistenceRef = useRef(0);
  const flushResolversRef = useRef<Array<() => void>>([]);
  const dirtyIdsRef = useRef(new Set<string>());

  type PersistenceBatch = {
    adapter: Unstable_InteractablePersistenceAdapter;
    payload: Unstable_InteractablePersistedState;
    dirtyIds: Set<string>;
    seq: number;
  };

  const outgoingQueueRef = useRef<PersistenceBatch[]>([]);
  const runPersistenceRef = useRef<(batch?: PersistenceBatch) => void>(
    () => {},
  );

  const setStateAndRef = useCallback(
    (
      updater: (
        prev: Unstable_InteractablesState,
      ) => Unstable_InteractablesState,
    ) => {
      const next = updater(stateRef.current);
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  const exportState = useCallback((): Unstable_InteractablePersistedState => {
    const result: Unstable_InteractablePersistedState = {};
    for (const [id, def] of Object.entries(stateRef.current.definitions)) {
      if (def.scope === "thread") continue; // thread items persist via snapshot, not the adapter
      result[id] = { name: def.name, state: def.state };
    }
    return result;
  }, []);

  const takeDirtyBatch = useCallback(
    (
      adapter: Unstable_InteractablePersistenceAdapter,
    ): PersistenceBatch | undefined => {
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
    (adapter: Unstable_InteractablePersistenceAdapter) => {
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

  const flushIfPending = useCallback(() => {
    if (debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
    if (adapterRef.current) enqueuePersistence(adapterRef.current);
  }, [enqueuePersistence]);

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

  const restorePersistedState = useCallback(
    (
      saved: Unstable_InteractablePersistedState,
      options: RestorePersistedStateOptions,
    ) => {
      const shouldStash = options.shouldStash ?? (() => true);
      const shouldApply = options.shouldApply ?? (() => true);

      for (const [id, entry] of Object.entries(saved)) {
        if (shouldStash(id)) options.stash.set(id, entry.state);
      }
      setStateAndRef((prev) => {
        let changed = false;
        const definitions = { ...prev.definitions };
        for (const [id, entry] of Object.entries(saved)) {
          const def = definitions[id];
          if (!def || !shouldApply(id, def)) continue;
          definitions[id] = { ...def, state: entry.state };
          changed = true;
        }
        if (!changed) return prev;
        return { ...prev, definitions };
      });
    },
    [setStateAndRef],
  );

  const importState = useCallback(
    (saved: Unstable_InteractablePersistedState) => {
      restorePersistedState(saved, { stash: detachedAppStateRef.current });
    },
    [restorePersistedState],
  );

  // Applies adapter.load() output: a local edit made while the load was in
  // flight wins, and thread-scoped items never restore from the adapter.
  const applyLoadedState = useCallback(
    (saved: Unstable_InteractablePersistedState) => {
      restorePersistedState(saved, {
        stash: loadedStateRef.current,
        shouldStash: (id) => !touchedIdsRef.current.has(id),
        shouldApply: (id, def) =>
          !touchedIdsRef.current.has(id) && def.scope !== "thread",
      });
    },
    [restorePersistedState],
  );

  const loadFromAdapter = useCallback(
    async (adapter: Unstable_InteractablePersistenceAdapter) => {
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
    (adapter: Unstable_InteractablePersistenceAdapter | undefined) => {
      if (adapterRef.current !== adapter) flushIfPending();
      adapterRef.current = adapter;
      if (adapter) void loadFromAdapter(adapter);
    },
    [flushIfPending, loadFromAdapter],
  );

  const getCurrentThreadId = useCallback((): string | undefined => {
    const client = clientRef.current;
    if (!client) return undefined;

    const threadListItem = client.threadListItem;
    if (threadListItem.source != null) {
      return threadListItem().getState().id;
    }

    const threads = client.threads;
    if (threads.source != null) {
      return threads().getState().mainThreadId;
    }

    return undefined;
  }, [clientRef]);

  useEffect(() => {
    if (!persistence) return;
    setPersistenceAdapter(persistence);
    return () => {
      if (adapterRef.current === persistence) {
        setPersistenceAdapter(undefined);
      }
    };
  }, [persistence, setPersistenceAdapter]);

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
      if (stateRef.current.definitions[id]?.scope !== "thread") {
        schedulePersistence(id);
      }
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
            streamBaselinesRef.current,
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

  const installUpdateToolUI = useCallback(
    (name: string, entry: UpdateToolUIEntry) => {
      const toolsAccessor = clientRef.current?.tools;
      if (!toolsAccessor || toolsAccessor.source == null) return false;
      entry.unsubscribe = toolsAccessor().setToolUI(
        interactableToolName(name),
        entry.render,
        { standalone: true },
      );
      return true;
    },
    [clientRef],
  );

  // register() installs update-tool UIs against the tools instance bound at
  // call time; this re-applies the retained entries when that instance is
  // structurally replaced and installs entries recorded while no tools
  // scope was available. Each re-apply releases the entry's previous
  // install first, so it is an orphaned no-op against a replaced instance
  // and an idempotent replacement against a live one.
  useAssistantScopeEffect(
    "tools",
    () => {
      for (const [name, entry] of updateToolUIsRef.current) {
        entry.unsubscribe?.();
        entry.unsubscribe = undefined;
        installUpdateToolUI(name, entry);
      }
      return () => {
        for (const entry of updateToolUIsRef.current.values()) {
          entry.unsubscribe?.();
          entry.unsubscribe = undefined;
        }
      };
    },
    [installUpdateToolUI],
  );

  const register = useCallback(
    (def: InternalInteractableRegistration) => {
      const threadAccessor = clientRef.current?.thread;
      const threadMessages =
        threadAccessor && threadAccessor.source != null
          ? (threadAccessor().getState().messages ?? [])
          : [];
      const scope =
        def.scope ??
        (hasInteractableCreateCall(threadMessages, def.id, def.name)
          ? "thread"
          : "app");

      if (
        process.env.NODE_ENV !== "production" &&
        stateRef.current.definitions[def.id] &&
        scope !== "thread"
      ) {
        console.warn(
          `[Interactables] "${def.name}" (${def.id}) is already registered. ` +
            `Register an app-scoped interactable once (unstable_useInteractable) and ` +
            `read it from other components with unstable_useInteractableState.`,
        );
      }

      registrationCountsRef.current.set(
        def.id,
        (registrationCountsRef.current.get(def.id) ?? 0) + 1,
      );

      let releaseUpdateToolUI: (() => void) | undefined;
      if (def.updateRender) {
        const existing = updateToolUIsRef.current.get(def.name);
        const entry = existing ?? {
          count: 0,
          render: def.updateRender,
          unsubscribe: undefined,
        };
        entry.count++;
        if (!existing) updateToolUIsRef.current.set(def.name, entry);

        if (
          !entry.unsubscribe &&
          !installUpdateToolUI(def.name, entry) &&
          process.env.NODE_ENV !== "production"
        ) {
          console.warn(
            `[Interactables] "${def.name}" supplied an updateRender, but no ` +
              `tools scope is available yet; it will be installed once one appears.`,
          );
        }

        releaseUpdateToolUI = () => {
          const entry = updateToolUIsRef.current.get(def.name);
          if (!entry) return;
          if (--entry.count === 0) {
            updateToolUIsRef.current.delete(def.name);
            entry.unsubscribe?.();
            entry.unsubscribe = undefined;
          }
        };
      }

      // The same id re-registers once per anchor (its create call + each update_*).
      if (!partialSchemaCacheRef.current.has(def.id)) {
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
      }

      const threadId = scope === "thread" ? getCurrentThreadId() : undefined;
      const detached =
        scope === "thread"
          ? threadId
            ? detachedThreadStateRef.current.get(threadId)?.get(def.id)
            : undefined
          : detachedAppStateRef.current.get(def.id);
      if (scope === "thread") {
        if (threadId)
          detachedThreadStateRef.current.get(threadId)?.delete(def.id);
      } else {
        detachedAppStateRef.current.delete(def.id);
      }
      const loaded =
        scope === "thread" ? undefined : loadedStateRef.current.get(def.id);

      // Tool-created items restore from what the model already knows in this
      // thread (the creating call's args, sent snapshots, and the model's own
      // update_* calls) on a fresh reload; detached (in-session remount) still
      // wins so an unsent edit survives a scroll/virtualization cycle.
      const known =
        scope === "thread"
          ? findModelKnownState(threadMessages, def.id, def.name)
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
            scope,
            state:
              prev.definitions[def.id]?.state ??
              detached ??
              known?.state ??
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
            if (existing.scope === "thread") {
              const threadId = getCurrentThreadId();
              if (threadId) {
                let stateById = detachedThreadStateRef.current.get(threadId);
                if (!stateById) {
                  stateById = new Map();
                  detachedThreadStateRef.current.set(threadId, stateById);
                }
                stateById.set(def.id, existing.state);
              }
            } else {
              detachedAppStateRef.current.set(def.id, existing.state);
            }
          }
          partialSchemaCacheRef.current.delete(def.id);
          const { [def.id]: _, ...rest } = prev.definitions;
          const { [def.id]: __, ...restPersistence } = prev.persistence;
          return { ...prev, definitions: rest, persistence: restPersistence };
        });
      };
    },
    [
      flushIfPending,
      clientRef,
      getCurrentThreadId,
      installUpdateToolUI,
      setStateAndRef,
    ],
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

/**
 * Registers the unstable interactables store scope.
 *
 * @deprecated Unstable / Experimental (not actually removed).
 */
export const unstable_Interactables = resource(useInteractablesResource);

attachTransformScopes(useInteractablesResource, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
