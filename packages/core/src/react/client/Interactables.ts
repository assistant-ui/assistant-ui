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
import { toJSONSchema } from "assistant-stream";
import { ModelContext } from "../../store/clients/model-context-client";
import {
  buildInteractableModelContext,
  type StateJSONSchema,
} from "./interactable-model-context";
import {
  findModelKnownState,
  interactableToolName,
} from "../../model-context/interactable-composer-metadata";
import { notifySubscribers as notifyStateSubscribers } from "../../subscribable/subscribable";
import {
  FLUSH_LOAD_TIMEOUT_MS,
  PERSISTENCE_DEBOUNCE_MS,
  useInteractablePersistenceQueue,
} from "../interactables-shared/useInteractablePersistenceQueue";
import { nullProtoRecord } from "../../utils/record";

type RestorePersistedStateOptions = {
  stash: Map<string, Unstable_InteractablePersistedState[string]>;
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
    definitions: nullProtoRecord(),
    persistence: nullProtoRecord(),
  }));

  const clientRef = useAssistantClientRef();
  const clientRefRef = useRef(clientRef);
  clientRefRef.current = clientRef;

  const stateRef = useRef(state);

  const subscribersRef = useRef(new Set<() => void>());
  const schemaCacheRef = useRef(new Map<string, StateJSONSchema>());
  const schemaSourceRef = useRef(
    new Map<string, Unstable_InteractableRegistration["stateSchema"]>(),
  );
  const streamBaselinesRef = useRef(
    new Map<string, { targetId: string; state: unknown }>(),
  );
  const detachedAppStateRef = useRef(
    new Map<string, Unstable_InteractablePersistedState[string]>(),
  );
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
  const loadedStateRef = useRef(
    new Map<string, Unstable_InteractablePersistedState[string]>(),
  );
  // Ids edited locally this session — a local edit always wins over a slow load.
  const touchedIdsRef = useRef(new Set<string>());
  const declarativePersistenceRef = useRef<
    Unstable_InteractablePersistenceAdapter | undefined
  >(undefined);

  const adapterRef = useRef<
    Unstable_InteractablePersistenceAdapter | undefined
  >(undefined);
  const saveAdapterRef = useRef<
    Unstable_InteractablePersistenceAdapter | undefined
  >(undefined);
  const adapterLoadRef = useRef<
    | {
        adapter: Unstable_InteractablePersistenceAdapter;
        promise: Promise<boolean>;
      }
    | undefined
  >(undefined);
  const adapterGenerationRef = useRef(0);
  const lastAttachedAdapterRef = useRef<
    Unstable_InteractablePersistenceAdapter | undefined
  >(undefined);
  const adapterPreparationTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

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
    const result =
      nullProtoRecord<Unstable_InteractablePersistedState[string]>();
    for (const [id, def] of Object.entries(stateRef.current.definitions)) {
      if (def.scope === "thread") continue; // thread items persist via snapshot, not the adapter
      result[id] = { name: def.name, state: def.state };
    }
    return result;
  }, []);

  const exportPersistenceState = useCallback(() => {
    const threadAccessor = clientRefRef.current.current?.thread;
    const threadMessages =
      threadAccessor && threadAccessor.source != null
        ? (threadAccessor().getState().messages ?? [])
        : [];
    const threadCreated = new Map<string, Set<string>>();
    for (const message of threadMessages) {
      if (message.role !== "assistant") continue;
      for (const part of message.content ?? []) {
        if (!part || typeof part !== "object") continue;
        const candidate = part as ToolCallLikePart;
        if (
          candidate.type !== "tool-call" ||
          candidate.toolCallId === undefined ||
          candidate.toolName === undefined
        ) {
          continue;
        }
        let names = threadCreated.get(candidate.toolCallId);
        if (!names) {
          names = new Set();
          threadCreated.set(candidate.toolCallId, names);
        }
        names.add(candidate.toolName);
      }
    }
    const isThreadScoped = (
      id: string,
      entry: Unstable_InteractablePersistedState[string],
    ) =>
      stateRef.current.definitions[id]?.scope === "thread" ||
      threadCreated.get(id)?.has(entry.name) === true;

    const result =
      nullProtoRecord<Unstable_InteractablePersistedState[string]>();
    for (const [id, entry] of loadedStateRef.current) {
      if (!isThreadScoped(id, entry)) {
        result[id] = entry;
      }
    }
    for (const [id, entry] of detachedAppStateRef.current) {
      if (!isThreadScoped(id, entry)) {
        result[id] = entry;
      }
    }
    return Object.assign(result, exportState());
  }, [exportState]);

  const updatePersistenceStatus = useCallback(
    (
      updater: (
        prev: Unstable_InteractablesState["persistence"],
      ) => Unstable_InteractablesState["persistence"],
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

  const {
    discardPending,
    flushIfPending,
    getDirtyIds,
    schedulePersistence,
    flush: flushPersistence,
  } = useInteractablePersistenceQueue({
    adapterRef: saveAdapterRef,
    adapterGenerationRef,
    snapshot: exportPersistenceState,
    updatePersistenceStatus,
    retainDirtyWithoutAdapter: true,
  });

  const restorePersistedState = useCallback(
    (
      saved: Unstable_InteractablePersistedState,
      options: RestorePersistedStateOptions,
    ) => {
      const shouldStash = options.shouldStash ?? (() => true);
      const shouldApply = options.shouldApply ?? (() => true);

      for (const [id, entry] of Object.entries(saved)) {
        if (shouldStash(id)) options.stash.set(id, entry);
      }
      setStateAndRef((prev) => {
        let changed = false;
        const definitions = nullProtoRecord(prev.definitions);
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
      if (!adapter.load) return { status: "loaded" } as const;
      try {
        const saved = await adapter.load();
        if (adapterRef.current !== adapter) return { status: "stale" } as const;
        if (saved) applyLoadedState(saved);
        return { status: "loaded" } as const;
      } catch (e) {
        console.warn("[Interactables] Persistence load failed.", e);
        return { status: "error", error: e } as const;
      }
    },
    [applyLoadedState],
  );

  const updateDirtyLoadStatus = useCallback(
    (status: { isPending: boolean; error: unknown }) => {
      const dirtyIds = getDirtyIds();
      if (dirtyIds.size === 0) return;
      updatePersistenceStatus((prev) => {
        let changed = false;
        const persistence = nullProtoRecord(prev);
        for (const id of dirtyIds) {
          if (stateRef.current.definitions[id] === undefined) continue;
          if (
            prev[id]?.isPending === status.isPending &&
            prev[id]?.error === status.error
          ) {
            continue;
          }
          persistence[id] = status;
          changed = true;
        }
        return changed ? persistence : prev;
      });
    },
    [getDirtyIds, updatePersistenceStatus],
  );

  const prepareAdapter = useCallback(
    (adapter: Unstable_InteractablePersistenceAdapter) => {
      if (saveAdapterRef.current === adapter) return Promise.resolve(true);

      updateDirtyLoadStatus({ isPending: true, error: undefined });
      const currentLoad = adapterLoadRef.current;
      if (currentLoad?.adapter === adapter) return currentLoad.promise;

      let promise!: Promise<boolean>;
      promise = loadFromAdapter(adapter).then((result) => {
        if (adapterLoadRef.current?.promise === promise) {
          adapterLoadRef.current = undefined;
        }
        if (adapterRef.current !== adapter) return false;
        if (result.status === "error") {
          updateDirtyLoadStatus({ isPending: false, error: result.error });
          return false;
        }
        if (result.status !== "loaded") return false;

        if (adapterPreparationTimerRef.current !== undefined) {
          clearTimeout(adapterPreparationTimerRef.current);
          adapterPreparationTimerRef.current = undefined;
        }
        saveAdapterRef.current = adapter;
        flushIfPending();
        return true;
      });
      adapterLoadRef.current = { adapter, promise };
      return promise;
    },
    [flushIfPending, loadFromAdapter, updateDirtyLoadStatus],
  );

  const scheduleAdapterPreparation = useCallback(
    (adapter: Unstable_InteractablePersistenceAdapter) => {
      if (adapterPreparationTimerRef.current !== undefined) {
        clearTimeout(adapterPreparationTimerRef.current);
      }
      adapterPreparationTimerRef.current = setTimeout(() => {
        adapterPreparationTimerRef.current = undefined;
        if (
          adapterRef.current === adapter &&
          saveAdapterRef.current !== adapter
        ) {
          void prepareAdapter(adapter);
        }
      }, PERSISTENCE_DEBOUNCE_MS);
    },
    [prepareAdapter],
  );

  const resetPersistenceScope = useCallback(() => {
    loadedStateRef.current.clear();
    touchedIdsRef.current.clear();
    detachedAppStateRef.current.clear();
    for (const [toolCallId, baseline] of streamBaselinesRef.current) {
      if (stateRef.current.definitions[baseline.targetId]?.scope !== "thread") {
        streamBaselinesRef.current.delete(toolCallId);
      }
    }
    setStateAndRef((prev) => {
      let changed = false;
      const definitions = nullProtoRecord(prev.definitions);
      for (const [id, def] of Object.entries(definitions)) {
        if (def.scope === "thread") continue;
        definitions[id] = { ...def, state: def.initialState };
        changed = true;
      }
      const persistence = nullProtoRecord(prev.persistence);
      for (const id of Object.keys(prev.persistence)) {
        delete persistence[id];
        changed = true;
      }
      return changed ? { ...prev, definitions, persistence } : prev;
    });
  }, [setStateAndRef]);

  const setPersistenceAdapter = useCallback(
    (adapter: Unstable_InteractablePersistenceAdapter | undefined) => {
      const previous = adapterRef.current;
      if (previous !== adapter) {
        if (adapterPreparationTimerRef.current !== undefined) {
          clearTimeout(adapterPreparationTimerRef.current);
          adapterPreparationTimerRef.current = undefined;
        }
        flushIfPending();
        saveAdapterRef.current = undefined;
      }
      adapterRef.current = adapter;
      if (!adapter) {
        const dirtyIds = getDirtyIds();
        if (dirtyIds.size > 0) {
          updatePersistenceStatus((prev) => {
            let changed = false;
            const persistence = nullProtoRecord(prev);
            for (const id of dirtyIds) {
              if (prev[id] === undefined) continue;
              delete persistence[id];
              changed = true;
            }
            return changed ? persistence : prev;
          });
        }
        adapterLoadRef.current = undefined;
        return;
      }

      const lastAttached = lastAttachedAdapterRef.current;
      lastAttachedAdapterRef.current = adapter;
      if (lastAttached !== undefined && lastAttached !== adapter) {
        discardPending();
        adapterGenerationRef.current += 1;
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[Interactables] The persistence adapter identity changed, so app-scoped state was reset for the new scope. Memoize the adapter unless this is an account or workspace switch.",
          );
        }
        resetPersistenceScope();
      }
      void prepareAdapter(adapter);
    },
    [
      discardPending,
      flushIfPending,
      getDirtyIds,
      prepareAdapter,
      resetPersistenceScope,
      updatePersistenceStatus,
    ],
  );

  useEffect(
    () => () => {
      if (adapterPreparationTimerRef.current !== undefined) {
        clearTimeout(adapterPreparationTimerRef.current);
      }
    },
    [],
  );

  const flush = useCallback(async () => {
    const adapter = adapterRef.current;
    if (adapter && saveAdapterRef.current !== adapter) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          prepareAdapter(adapter),
          new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), FLUSH_LOAD_TIMEOUT_MS);
          }),
        ]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }
    await flushPersistence();
  }, [flushPersistence, prepareAdapter]);

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
    if (!persistence && !declarativePersistenceRef.current) return;
    declarativePersistenceRef.current = persistence;
    setPersistenceAdapter(persistence);
  }, [persistence, setPersistenceAdapter]);

  useEffect(() => {
    return () => {
      if (!declarativePersistenceRef.current) return;
      declarativePersistenceRef.current = undefined;
      setPersistenceAdapter(undefined);
    };
  }, [setPersistenceAdapter]);

  const setDefState = useCallback(
    (id: string, updater: (prev: unknown) => unknown) => {
      if (!stateRef.current.definitions[id]) return;
      touchedIdsRef.current.add(id);
      setStateAndRef((prev) => {
        const existing = prev.definitions[id]!;
        return {
          ...prev,
          definitions: nullProtoRecord(prev.definitions, {
            [id]: { ...existing, state: updater(existing.state) },
          }),
        };
      });
      if (stateRef.current.definitions[id]?.scope !== "thread") {
        schedulePersistence(id);
        const adapter = adapterRef.current;
        if (adapter && saveAdapterRef.current !== adapter) {
          updateDirtyLoadStatus({ isPending: true, error: undefined });
          scheduleAdapterPreparation(adapter);
        }
      }
    },
    [
      scheduleAdapterPreparation,
      schedulePersistence,
      setStateAndRef,
      updateDirtyLoadStatus,
    ],
  );

  const provider = useMemo(
    () => ({
      getModelContext: () => {
        const defs = stateRef.current.definitions;
        return (
          buildInteractableModelContext(
            defs,
            schemaCacheRef.current,
            setDefState,
            () => stateRef.current.definitions,
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
      if (schemaSourceRef.current.get(def.id) !== def.stateSchema) {
        schemaSourceRef.current.set(def.id, def.stateSchema);
        schemaCacheRef.current.delete(def.id);
        try {
          const jsonSchema = toJSONSchema(def.stateSchema);
          schemaCacheRef.current.set(def.id, jsonSchema);
        } catch (e) {
          console.warn(
            `[Interactables] Failed to convert the state schema of "${def.name}" to JSON Schema. The update tool will accept arbitrary fields without validation.`,
            e,
          );
        }
      }

      const threadId = scope === "thread" ? getCurrentThreadId() : undefined;
      const detachedState =
        scope === "thread"
          ? threadId
            ? detachedThreadStateRef.current.get(threadId)?.get(def.id)
            : undefined
          : detachedAppStateRef.current.get(def.id)?.state;
      if (scope === "thread") {
        loadedStateRef.current.delete(def.id);
        if (threadId)
          detachedThreadStateRef.current.get(threadId)?.delete(def.id);
      } else {
        detachedAppStateRef.current.delete(def.id);
      }
      const loadedState =
        scope === "thread"
          ? undefined
          : loadedStateRef.current.get(def.id)?.state;

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
        definitions: nullProtoRecord(prev.definitions, {
          [def.id]: {
            id: def.id,
            name: def.name,
            description: def.description,
            stateSchema: def.stateSchema,
            initialState: def.initialState,
            scope,
            state:
              prev.definitions[def.id]?.state ??
              detachedState ??
              known?.state ??
              loadedState ??
              def.initialState,
          },
        }),
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
              detachedAppStateRef.current.set(def.id, {
                name: existing.name,
                state: existing.state,
              });
            }
          }
          schemaSourceRef.current.delete(def.id);
          schemaCacheRef.current.delete(def.id);
          const definitions = nullProtoRecord(prev.definitions);
          const persistence = nullProtoRecord(prev.persistence);
          delete definitions[def.id];
          delete persistence[def.id];
          return { ...prev, definitions, persistence };
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
