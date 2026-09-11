import { useCallback, useRef, type RefObject } from "react";
import { nullProtoRecord } from "../../utils/record";

const PERSISTENCE_DEBOUNCE_MS = 500;

type PersistenceAdapter<State> = {
  save(state: State): void | Promise<void>;
};

type PersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

type PersistenceStatusMap = Record<string, PersistenceStatus>;

type PersistenceStatusUpdater = (
  updater: (prev: PersistenceStatusMap) => PersistenceStatusMap,
) => void;

type UseInteractablePersistenceQueueOptions<State> = {
  adapterRef: RefObject<PersistenceAdapter<State> | undefined>;
  snapshot: () => State;
  updatePersistenceStatus: PersistenceStatusUpdater;
};

export const useInteractablePersistenceQueue = <State>({
  adapterRef,
  snapshot,
  updatePersistenceStatus,
}: UseInteractablePersistenceQueueOptions<State>) => {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const syncSeqRef = useRef(0);
  const latestSyncSeqByIdRef = useRef(new Map<string, number>());
  const inFlightPersistenceRef = useRef(0);
  const flushResolversRef = useRef<Array<() => void>>([]);
  const dirtyIdsRef = useRef(new Set<string>());

  type PersistenceBatch = {
    adapter: PersistenceAdapter<State>;
    payload: State;
    dirtyIds: Set<string>;
    seq: number;
  };

  const outgoingQueueRef = useRef<PersistenceBatch[]>([]);
  const runPersistenceRef = useRef<(batch?: PersistenceBatch) => void>(
    () => {},
  );

  const takeDirtyBatch = useCallback(
    (adapter: PersistenceAdapter<State>): PersistenceBatch | undefined => {
      if (dirtyIdsRef.current.size === 0) return;
      const dirtyIds = new Set(dirtyIdsRef.current);
      dirtyIdsRef.current.clear();
      const seq = ++syncSeqRef.current;
      for (const id of dirtyIds) latestSyncSeqByIdRef.current.set(id, seq);
      return { adapter, payload: snapshot(), dirtyIds, seq };
    },
    [snapshot],
  );

  const enqueuePersistence = useCallback(
    (adapter: PersistenceAdapter<State>) => {
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

      updatePersistenceStatus((prev) => {
        const persistence = nullProtoRecord(prev);
        for (const id of dirtyIds) {
          persistence[id] = { isPending: true, error: undefined };
        }
        return persistence;
      });

      const settleBatch = (status: PersistenceStatus | undefined) => {
        const settledIds: string[] = [];
        for (const id of dirtyIds) {
          if (
            latestSyncSeqByIdRef.current.get(id) !== seq ||
            dirtyIdsRef.current.has(id)
          )
            continue;
          latestSyncSeqByIdRef.current.delete(id);
          settledIds.push(id);
        }
        if (settledIds.length === 0) return;
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
      };

      try {
        await adapter.save(payload);
        settleBatch(undefined);
      } catch (e) {
        settleBatch({ isPending: false, error: e });
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
    [adapterRef, takeDirtyBatch, updatePersistenceStatus],
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
    [adapterRef, enqueuePersistence],
  );

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
  }, [adapterRef, enqueuePersistence]);

  return { flushIfPending, schedulePersistence, flush };
};
