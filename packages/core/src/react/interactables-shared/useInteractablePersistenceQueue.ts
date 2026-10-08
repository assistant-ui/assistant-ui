import { useCallback, useRef, type RefObject } from "react";
import { nullProtoRecord } from "../../utils/record";

export const PERSISTENCE_DEBOUNCE_MS = 500;

/**
 * `load` is caller code with no settling contract, so an awaited `flush` bounds
 * the wait rather than inheriting it. Past this the edit stays queued for the
 * next successful snapshot, which is the same shape a failed load already has.
 */
export const FLUSH_LOAD_TIMEOUT_MS = 5_000;

/**
 * `save` has no settling contract either, so a load waiting on earlier saves
 * to the same adapter stops waiting here and hands the unsettled batches back.
 */
export const SAVE_WAIT_TIMEOUT_MS = 5_000;

type PersistenceAdapter<State> = {
  save(state: State): void | Promise<void>;
};

type PersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

type SyncRecord = { seq: number; adapterGeneration: number };

type PersistenceStatusMap = Record<string, PersistenceStatus>;

type PersistenceStatusUpdater = (
  updater: (prev: PersistenceStatusMap) => PersistenceStatusMap,
) => void;

type UseInteractablePersistenceQueueOptions<State> = {
  adapterRef: RefObject<PersistenceAdapter<State> | undefined>;
  adapterGenerationRef: RefObject<number>;
  snapshot: () => State;
  updatePersistenceStatus: PersistenceStatusUpdater;
  retainDirtyWithoutAdapter?: boolean;
};

export const useInteractablePersistenceQueue = <State>({
  adapterRef,
  adapterGenerationRef,
  snapshot,
  updatePersistenceStatus,
  retainDirtyWithoutAdapter = false,
}: UseInteractablePersistenceQueueOptions<State>) => {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const syncSeqRef = useRef(0);
  const latestSyncByIdRef = useRef(new Map<string, SyncRecord>());
  const inFlightPersistenceRef = useRef(0);
  const flushResolversRef = useRef<Array<() => void>>([]);
  const dirtyIdsRef = useRef(new Set<string>());
  const failedIdsRef = useRef(new Map<string, SyncRecord>());

  type PersistenceBatch = {
    adapter: PersistenceAdapter<State>;
    payload: State;
    dirtyIds: Set<string>;
    retryIds: Set<string>;
    seq: number;
    adapterGeneration: number;
    timedOut: boolean;
    settled: Promise<void>;
    settle: () => void;
  };

  type RecoverableBatch = {
    payload: State;
    dirtyIds: Set<string>;
  };

  type AdapterRecovery = {
    seq: number;
    batch: RecoverableBatch;
  };

  const outgoingQueueRef = useRef<PersistenceBatch[]>([]);
  const unsettledBatchesRef = useRef(new Set<PersistenceBatch>());
  const recoveryByAdapterRef = useRef(
    new WeakMap<PersistenceAdapter<State>, AdapterRecovery>(),
  );
  const runPersistenceRef = useRef<(batch?: PersistenceBatch) => void>(
    () => {},
  );

  /**
   * A failure stays recorded until a save persists its value, so a snapshot
   * that is already queued can still settle it. An id with a sync record is
   * already part of a queued retry.
   */
  const takeRetryIds = useCallback(
    (dirtyIds: Set<string>) => {
      const retryIds = new Set<string>();
      for (const [id, failed] of failedIdsRef.current) {
        if (
          dirtyIds.has(id) ||
          failed.adapterGeneration !== adapterGenerationRef.current
        ) {
          failedIdsRef.current.delete(id);
        } else if (!latestSyncByIdRef.current.has(id)) {
          retryIds.add(id);
        }
      }
      return retryIds;
    },
    [adapterGenerationRef],
  );

  const hasRetryWork = useCallback(() => {
    for (const [id, failed] of failedIdsRef.current) {
      if (
        failed.adapterGeneration === adapterGenerationRef.current &&
        !latestSyncByIdRef.current.has(id)
      )
        return true;
    }
    return false;
  }, [adapterGenerationRef]);

  /**
   * A batch's snapshot holds every id, so it persists the current value of an
   * id that failed in an earlier batch of the same scope and was not edited
   * since.
   */
  const takePersistedFailures = useCallback(
    ({ seq, adapterGeneration }: SyncRecord) => {
      const persistedIds: string[] = [];
      for (const [id, failed] of failedIdsRef.current) {
        if (
          failed.adapterGeneration !== adapterGeneration ||
          failed.seq >= seq ||
          dirtyIdsRef.current.has(id)
        )
          continue;
        failedIdsRef.current.delete(id);
        latestSyncByIdRef.current.delete(id);
        persistedIds.push(id);
      }
      return persistedIds;
    },
    [],
  );

  const takeDirtyBatch = useCallback(
    (
      adapter: PersistenceAdapter<State>,
      retryFailed = false,
    ): PersistenceBatch | undefined => {
      if (dirtyIdsRef.current.size === 0 && !(retryFailed && hasRetryWork()))
        return;
      const dirtyIds = new Set(dirtyIdsRef.current);
      dirtyIdsRef.current.clear();
      const retryIds = takeRetryIds(dirtyIds);
      const seq = ++syncSeqRef.current;
      const adapterGeneration = adapterGenerationRef.current;
      for (const id of [...dirtyIds, ...retryIds])
        latestSyncByIdRef.current.set(id, { seq, adapterGeneration });
      const recovery = recoveryByAdapterRef.current.get(adapter);
      const recoverableDirtyIds = new Set(recovery?.batch.dirtyIds ?? []);
      for (const id of [...dirtyIds, ...retryIds]) recoverableDirtyIds.add(id);
      const payload = snapshot();
      recoveryByAdapterRef.current.set(adapter, {
        seq,
        batch: { payload, dirtyIds: recoverableDirtyIds },
      });
      const blockedByTimedOutBatch = [...unsettledBatchesRef.current].some(
        (batch) => batch.adapter === adapter && batch.timedOut,
      );
      let settle!: () => void;
      const settled = new Promise<void>((resolve) => {
        settle = resolve;
      });
      const batch: PersistenceBatch = {
        adapter,
        adapterGeneration,
        payload,
        dirtyIds,
        retryIds,
        seq,
        timedOut: blockedByTimedOutBatch,
        settled,
        settle,
      };
      unsettledBatchesRef.current.add(batch);
      return batch;
    },
    [adapterGenerationRef, hasRetryWork, snapshot, takeRetryIds],
  );

  /**
   * A retry id loses its sync record once an earlier snapshot saved it, so a
   * queued batch left with only such ids has nothing to save.
   */
  const takeQueuedBatch = useCallback((): PersistenceBatch | undefined => {
    for (
      let batch = outgoingQueueRef.current.shift();
      batch;
      batch = outgoingQueueRef.current.shift()
    ) {
      const { seq } = batch;
      batch.retryIds = new Set(
        [...batch.retryIds].filter(
          (id) => latestSyncByIdRef.current.get(id)?.seq === seq,
        ),
      );
      if (batch.dirtyIds.size > 0 || batch.retryIds.size > 0) return batch;
      if (recoveryByAdapterRef.current.get(batch.adapter)?.seq === seq) {
        recoveryByAdapterRef.current.delete(batch.adapter);
      }
      unsettledBatchesRef.current.delete(batch);
      batch.settle();
    }
    return undefined;
  }, []);

  const enqueuePersistence = useCallback(
    (adapter: PersistenceAdapter<State>, retryFailed = false) => {
      const batch = takeDirtyBatch(adapter, retryFailed);
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

      const { adapter, adapterGeneration, payload, dirtyIds, retryIds, seq } =
        resolved;
      resolved.timedOut = false;
      inFlightPersistenceRef.current += 1;

      updatePersistenceStatus((prev) => {
        const persistence = nullProtoRecord(prev);
        for (const id of dirtyIds) {
          persistence[id] = { isPending: true, error: undefined };
        }
        for (const id of retryIds) {
          const status = prev[id];
          if (status)
            persistence[id] = { isPending: true, error: status.error };
        }
        return persistence;
      });

      const settleBatch = (
        status: PersistenceStatus | undefined,
        persistedIds: string[] = [],
      ) => {
        const settledIds = [...persistedIds];
        for (const id of [...dirtyIds, ...retryIds]) {
          if (latestSyncByIdRef.current.get(id)?.seq !== seq) continue;
          latestSyncByIdRef.current.delete(id);
          if (dirtyIdsRef.current.has(id)) continue;
          settledIds.push(id);
        }
        if (settledIds.length === 0) return settledIds;
        updatePersistenceStatus((prev) => {
          let changed = false;
          const persistence = nullProtoRecord(prev);
          for (const id of settledIds) {
            if (prev[id] === undefined) continue;
            if (status === undefined) delete persistence[id];
            else persistence[id] = status;
            changed = true;
          }
          return changed ? persistence : prev;
        });
        return settledIds;
      };

      try {
        await adapter.save(payload);
        const recovery = recoveryByAdapterRef.current.get(adapter);
        if (recovery && recovery.seq <= seq) {
          recoveryByAdapterRef.current.delete(adapter);
        }
        settleBatch(
          undefined,
          takePersistedFailures({ seq, adapterGeneration }),
        );
      } catch (e) {
        const isCurrentScope =
          adapterGenerationRef.current === adapterGeneration;
        if (!isCurrentScope) {
          console.warn(
            "[Interactables] Persistence save failed after the adapter changed.",
            e,
          );
        }
        if (isCurrentScope) {
          for (const id of settleBatch({ isPending: false, error: e }))
            failedIdsRef.current.set(id, { seq, adapterGeneration });
        } else {
          settleBatch(undefined);
        }
      } finally {
        unsettledBatchesRef.current.delete(resolved);
        resolved.settle();
        inFlightPersistenceRef.current -= 1;
        const next =
          takeQueuedBatch() ??
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
    [
      adapterGenerationRef,
      adapterRef,
      takeDirtyBatch,
      takePersistedFailures,
      takeQueuedBatch,
      updatePersistenceStatus,
    ],
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
  }, [adapterRef, enqueuePersistence]);

  const schedulePersistence = useCallback(
    (id: string) => {
      if (!adapterRef.current && !retainDirtyWithoutAdapter) return;
      dirtyIdsRef.current.add(id);
      if (!adapterRef.current) return;
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
    [adapterRef, enqueuePersistence, retainDirtyWithoutAdapter],
  );

  const discardPending = useCallback(() => {
    if (debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
    dirtyIdsRef.current.clear();
    // A failure carried by a queued retry stays recorded, so an earlier
    // snapshot that saves it can still drop that retry as redundant.
    for (const id of failedIdsRef.current.keys()) {
      if (!latestSyncByIdRef.current.has(id)) failedIdsRef.current.delete(id);
    }
    if (
      inFlightPersistenceRef.current === 0 &&
      outgoingQueueRef.current.length === 0
    ) {
      for (const resolve of flushResolversRef.current) resolve();
      flushResolversRef.current = [];
    }
  }, []);

  const getDirtyIds = useCallback(() => new Set(dirtyIdsRef.current), []);

  const isSaving = useCallback(
    (id: string) =>
      !dirtyIdsRef.current.has(id) &&
      latestSyncByIdRef.current.get(id)?.adapterGeneration ===
        adapterGenerationRef.current,
    [adapterGenerationRef],
  );

  const flush = useCallback(async () => {
    if (debounceTimerRef.current !== undefined) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = undefined;
    }
    const hasWork =
      inFlightPersistenceRef.current > 0 ||
      outgoingQueueRef.current.length > 0 ||
      (adapterRef.current !== undefined &&
        (dirtyIdsRef.current.size > 0 || hasRetryWork()));
    if (!hasWork) return;
    const p = new Promise<void>((resolve) => {
      flushResolversRef.current.push(resolve);
    });
    if (adapterRef.current) enqueuePersistence(adapterRef.current, true);
    return p;
  }, [adapterRef, enqueuePersistence, hasRetryWork]);

  const waitForAdapterSaves = useCallback(
    async (adapter: PersistenceAdapter<State>) => {
      const batches = [...unsettledBatchesRef.current].filter(
        (batch) => batch.adapter === adapter && !batch.timedOut,
      );
      if (batches.length > 0) {
        let timer: ReturnType<typeof setTimeout> | undefined;
        let timedOut = false;
        try {
          await Promise.race([
            Promise.all(batches.map((batch) => batch.settled)),
            new Promise<void>((resolve) => {
              timer = setTimeout(() => {
                timedOut = true;
                resolve();
              }, SAVE_WAIT_TIMEOUT_MS);
            }),
          ]);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
        }
        if (timedOut) {
          for (const batch of unsettledBatchesRef.current) {
            if (batch.adapter === adapter) batch.timedOut = true;
          }
        }
      }
      const recovery = recoveryByAdapterRef.current.get(adapter);
      return recovery ? [recovery.batch] : [];
    },
    [],
  );

  const restoreAdapterRecovery = useCallback(
    (
      adapter: PersistenceAdapter<State>,
      batch: RecoverableBatch,
      restore: () => void,
    ) => {
      const recovery = recoveryByAdapterRef.current.get(adapter);
      if (recovery?.batch === batch) restore();
    },
    [],
  );

  return {
    discardPending,
    flushIfPending,
    getDirtyIds,
    isSaving,
    schedulePersistence,
    flush,
    waitForAdapterSaves,
    restoreAdapterRecovery,
  };
};
