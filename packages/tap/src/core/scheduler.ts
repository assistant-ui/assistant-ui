type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  // Per-scheduler run counts and reported errors for the CURRENT burst
  // (between two drained passes), so the re-run budget and error dedupe
  // are per logical flush on every path - not per pass.
  runCounts: Map<UpdateScheduler, number>;
  seenErrors: Map<UpdateScheduler, Set<string>>;
  // Consecutive saturated (ceiling-hitting) passes; reset when a pass
  // drains the queue.
  saturatedStreak: number;
  isScheduled: boolean;
};

const newFlushState = (): GlobalFlushState => ({
  schedulers: new Set([]),
  runCounts: new Map(),
  seenErrors: new Map(),
  saturatedStreak: 0,
  isScheduled: false,
});

// A scheduler re-run more than this many times in one flush is a resource
// that keeps re-dirtying itself (or a cycle of resources re-dirtying each
// other); the offender is dropped so the rest of the queue keeps flushing.
export const MAX_TASK_RUNS_PER_FLUSH = 50;
// A pass yields at this many tasks and continues on the next flush, so
// oversized batches chunk across macrotasks instead of blocking. ~1.5x
// the motivating repro (one 200-message history page ~= 600 resources).
export const MAX_TASKS_PER_FLUSH = 1000;
// flushTapSync-only hard bound: a synchronous drain cannot defer, so an
// unbounded batch (e.g. fresh schedulers minted mid-drain, which the
// re-run guard cannot see) must be cut somewhere. ~8x the repro; the
// remainder is handed to the outer state and continues there.
export const MAX_SYNC_TASKS = 5000;
// A runaway minting fresh schedulers saturates EVERY pass, while a finite
// batch's last pass is always partial. After this many saturated passes
// in a row (x MAX_TASKS_PER_FLUSH tasks) the burst is reported once as a
// likely loop - and keeps chunking anyway, so even oversized finite
// batches complete. The queue is never dropped or stalled.
export const MAX_SATURATED_STREAK = 20;
let flushState: GlobalFlushState = newFlushState();

export class UpdateScheduler {
  private _isDirty = false;

  private readonly _task: Task;

  constructor(_task: Task) {
    this._task = _task;
  }

  get isDirty() {
    return this._isDirty;
  }

  markDirty() {
    this._isDirty = true;

    flushState.schedulers.add(this);
    scheduleFlush();
  }

  runTask() {
    this._isDirty = false;
    this._task();
  }
}

const scheduleFlush = () => {
  if (flushState.isScheduled) return;
  flushState.isScheduled = true;
  scheduleMacrotask();
};

const newDepthError = () =>
  new Error(
    `Maximum update depth exceeded. This can happen when a resource ` +
      `repeatedly calls setState inside useEffect.`,
  );

type CollectedErrors = unknown[] & { depthErrorReported?: boolean };

const reportDepthError = (errors: CollectedErrors) => {
  if (errors.depthErrorReported) return;
  errors.depthErrorReported = true;
  errors.push(newDepthError());
};

export const throwCollectedErrors = (
  errors: unknown[],
  context = "Errors occurred during flushSync",
): void => {
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    for (const error of errors) {
      console.error(error);
    }
    throw new AggregateError(errors, context);
  }
};

// One flush pass over flushState.schedulers. Set iteration also visits
// schedulers re-added mid-pass, so a batch of any size drains across
// passes; failures are appended to `errors` for the caller to aggregate.
const flushScheduled = (errors: CollectedErrors, defer = true): number => {
  const runCounts = flushState.runCounts;
  const seenErrors = flushState.seenErrors;
  let taskCount = 0;

  let hitCeiling = false;

  try {
    for (const scheduler of flushState.schedulers) {
      if (taskCount >= MAX_TASKS_PER_FLUSH) {
        hitCeiling = true;
        break;
      }
      const runs = (runCounts.get(scheduler) ?? 0) + 1;
      if (runs > MAX_TASK_RUNS_PER_FLUSH) {
        // Dropped, but left dirty: the flag gates publish() so the root
        // never emits un-applied state, and the next markDirty re-queues
        // it so its task drains the stranded queue consistently.
        reportDepthError(errors);
        flushState.schedulers.delete(scheduler);
        runCounts.delete(scheduler);
        continue;
      }
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;
      runCounts.set(scheduler, runs);
      taskCount += 1;

      try {
        scheduler.runTask();
      } catch (error) {
        // A deterministically re-throwing task can't flood the batch with
        // copies of the same failure.
        const message = error instanceof Error ? error.message : String(error);
        const seen = seenErrors.get(scheduler) ?? new Set<string>();
        if (!seen.has(message)) {
          seen.add(message);
          seenErrors.set(scheduler, seen);
          errors.push(error);
        }
      }
    }
  } finally {
    if (defer) {
      flushState.isScheduled = false;
      if (hitCeiling) {
        flushState.saturatedStreak += 1;
        if (flushState.saturatedStreak === MAX_SATURATED_STREAK + 1) {
          // Likely a loop - but saturation can't prove it, so this is a
          // diagnostic, not an exception: a finite batch this large must
          // still complete with zero thrown errors.
          console.warn(
            "Maximum update depth exceeded. This can happen when a resource " +
              "repeatedly calls setState inside useEffect.",
          );
        }
        scheduleFlush();
      } else {
        flushState.runCounts.clear();
        flushState.seenErrors.clear();
        flushState.saturatedStreak = 0;
      }
    }
  }

  return taskCount;
};

const flushAndThrow = () => {
  const errors: CollectedErrors = [];
  flushScheduled(errors);
  throwCollectedErrors(errors);
};

// Use MessageChannel to schedule flushes as macrotasks (like React's scheduler).
// This allows more state updates to batch into a single re-render.
// The channel is created on first use and its port is ref'd only while a flush
// is pending: an active MessagePort holds the Node event loop open, so neither
// importing tap nor an idle scheduler may keep one alive. ref/unref are
// Node-only, hence the optional calls.
const scheduleMacrotask = (() => {
  if (typeof MessageChannel !== "undefined") {
    let port1: (MessagePort & { ref?: () => void; unref?: () => void }) | null =
      null;
    let port2: MessagePort;
    return () => {
      if (!port1) {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => {
          port1?.unref?.();
          flushAndThrow();
        };
        port1 = channel.port1;
        port2 = channel.port2;
      }
      port1.ref?.();
      port2!.postMessage(null);
    };
  }
  // Fallback for environments without MessageChannel
  return () => setTimeout(flushAndThrow, 0);
})();

export const flushTapSync = <T>(callback: () => T): T => {
  const prev = flushState;
  flushState = newFlushState();
  flushState.isScheduled = true;

  const leftover: UpdateScheduler[] = [];
  try {
    const value = callback();
    // Synchronous callers rely on every notification having landed by the
    // time this returns, so drain across passes until the queue is empty.
    // The temporary flushState carries fresh run counts, so the re-run
    // budget is per logical flush, like main.
    const errors: CollectedErrors = [];
    let total = 0;
    while (flushState.schedulers.size > 0) {
      if (total > MAX_SYNC_TASKS) {
        // A sync batch this large defers the remainder to the outer state
        // instead of blocking (or erroring - the work is fine, it just
        // can't all land synchronously).
        for (const scheduler of flushState.schedulers) {
          leftover.push(scheduler);
        }
        break;
      }
      total += flushScheduled(errors, false);
    }
    throwCollectedErrors(errors);

    return value;
  } finally {
    flushState = prev;
    for (const scheduler of leftover) {
      prev.schedulers.add(scheduler);
    }
    if (leftover.length > 0) {
      scheduleFlush();
    }
  }
};
