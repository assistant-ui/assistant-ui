type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  // Tasks run since the queue last drained, across chunked passes.
  burstTaskTotal: number;
  isScheduled: boolean;
};

const newFlushState = (): GlobalFlushState => ({
  schedulers: new Set([]),
  burstTaskTotal: 0,
  isScheduled: false,
});

// A scheduler re-run more than this many times in one flush is a resource
// that keeps re-dirtying itself (or a cycle of resources re-dirtying each
// other); the offender is dropped so the rest of the queue keeps flushing.
const MAX_TASK_RUNS_PER_FLUSH = 50;
// A pass yields at this many tasks and continues on the next flush, so
// oversized batches chunk across macrotasks instead of blocking. ~1.5x
// the motivating repro (one 200-message history page ~= 600 resources).
const MAX_TASKS_PER_FLUSH = 1000;
// Last-resort termination, documented as the real bound: nothing can
// distinguish a huge finite cascade from an infinite one, so a burst that
// runs more than this many tasks in total (~80x the repro, ~= 16000
// messages in one update) is declared a loop and reported. The queue is
// never dropped; a stalled remainder continues on the next triggered
// flush.
const MAX_BURST_TASKS = 50000;
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

// Drains flushState.schedulers (Set iteration also visits schedulers
// re-added mid-pass, so bulk updates of any size land in a single batch)
// and appends failures to `errors` instead of throwing.
//
// The re-run guard has two modes by necessity: on the macrotask path the
// offender is SKIPPED and retried next pass (a deep-but-finite cascade
// still finishes; a true loop burns MAX_TASK_RUNS_PER_FLUSH runs and
// reports once per pass); inside flushTapSync there is no next pass, so
// the caller shares one runCounts map across passes and the offender is
// DROPPED at the limit, terminating the drain at ~50 runs like main.
const flushScheduled = (
  errors: CollectedErrors,
  defer = true,
  shared?: {
    runCounts: Map<UpdateScheduler, number>;
    errorContributors: Map<UpdateScheduler, Set<string>>;
  },
): number => {
  const runCounts = shared?.runCounts ?? new Map<UpdateScheduler, number>();
  const errorContributors =
    shared?.errorContributors ?? new Map<UpdateScheduler, Set<string>>();
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
        reportDepthError(errors);
        if (shared) {
          flushState.schedulers.delete(scheduler);
        }
        continue;
      }
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;
      runCounts.set(scheduler, runs);
      taskCount += 1;

      try {
        scheduler.runTask();
      } catch (error) {
        // One entry per (scheduler, message): a deterministically
        // re-throwing task can't flood the batch, and two different
        // failures - even with the same message - both surface.
        const message = error instanceof Error ? error.message : String(error);
        const seen = errorContributors.get(scheduler) ?? new Set<string>();
        if (!seen.has(message)) {
          seen.add(message);
          errorContributors.set(scheduler, seen);
          errors.push(error);
        }
      }
    }
  } finally {
    if (defer) {
      flushState.isScheduled = false;
      if (!hitCeiling) {
        flushState.burstTaskTotal = 0;
      } else {
        flushState.burstTaskTotal += taskCount;
        if (flushState.burstTaskTotal > MAX_BURST_TASKS) {
          // Runaway: report and stop auto-continuing. The queue is kept.
          flushState.burstTaskTotal = 0;
          reportDepthError(errors);
        } else {
          // Oversized but under the bound: chunk on, silently.
          scheduleFlush();
        }
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
    // time this returns, so drain across passes until the queue is empty;
    // the burst bound only fires for a runaway, whose remainder is handed
    // back to the outer state (see finally) rather than orphaned.
    const errors: CollectedErrors = [];
    // One run budget for the whole sync drain: a looping scheduler is
    // dropped at ~MAX_TASK_RUNS_PER_FLUSH total runs (like main), and the
    // burst bound only fires for a runaway, whose remainder is handed
    // back to the outer state (see finally) rather than orphaned.
    const shared = {
      runCounts: new Map<UpdateScheduler, number>(),
      errorContributors: new Map<UpdateScheduler, Set<string>>(),
    };
    let total = 0;
    while (flushState.schedulers.size > 0) {
      if (total > MAX_BURST_TASKS) {
        reportDepthError(errors);
        for (const scheduler of flushState.schedulers) {
          leftover.push(scheduler);
        }
        break;
      }
      total += flushScheduled(errors, false, shared);
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
