type QueuedRun<TPayload> = {
  payload: TPayload;
  resolve: () => void;
  reject: (reason: unknown) => void;
};

export type SerialRunQueue<TPayload> = {
  enqueue(payload: TPayload): Promise<void>;
  drop(): void;
};

/**
 * Serialize runs so at most one is in flight at a time. A payload enqueued
 * while a run is active waits for it to settle; each enqueue resolves once its
 * own run completes.
 *
 * `run` receives an `onComplete` callback to invoke atomically with its final
 * state flush; the queue reports `onRunningChange(false)` through it only when
 * nothing else is queued, so back-to-back runs form one continuous running
 * window. `onRunningChange` fires on transitions only.
 *
 * A run that rejects drops the payloads queued behind it (their promises
 * resolve without running) and rejects its own promise. `drop()` does the same
 * for everything not yet started, leaving an active run untouched.
 */
export const createSerialRunQueue = <TPayload>({
  run,
  onRunningChange,
}: {
  run: (payload: TPayload, onComplete: () => void) => Promise<void>;
  onRunningChange: (isRunning: boolean) => void;
}): SerialRunQueue<TPayload> => {
  const queue: QueuedRun<TPayload>[] = [];
  let draining = false;
  let running = false;

  const setRunning = (value: boolean) => {
    if (running === value) return;
    running = value;
    onRunningChange(value);
  };

  const drop = () => {
    for (const queued of queue.splice(0)) queued.resolve();
  };

  const drain = async () => {
    draining = true;
    try {
      let queued: QueuedRun<TPayload> | undefined;
      while ((queued = queue.shift())) {
        setRunning(true);
        try {
          await run(queued.payload, () => {
            if (queue.length === 0) setRunning(false);
          });
          queued.resolve();
        } catch (error) {
          drop();
          setRunning(false);
          queued.reject(error);
        }
      }
    } finally {
      draining = false;
      setRunning(false);
    }
  };

  return {
    enqueue: (payload) =>
      new Promise<void>((resolve, reject) => {
        queue.push({ payload, resolve, reject });
        if (!draining) void drain();
      }),
    drop,
  };
};
