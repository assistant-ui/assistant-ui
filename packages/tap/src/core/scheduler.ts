type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  isScheduled: boolean;
};

const newFlushState = (): GlobalFlushState => ({
  schedulers: new Set([]),
  isScheduled: false,
});

// A scheduler re-run more than this many times in one flush is a resource
// that keeps re-dirtying itself (or a cycle of resources re-dirtying each
// other); the offender is dropped so the rest of the queue keeps flushing.
const MAX_TASK_RUNS_PER_FLUSH = 50;
// Last-resort termination: a task that synchronously mints NEW schedulers
// (e.g. mounts another root mid-flush) never trips the per-scheduler
// guard, so an unbounded cascade of fresh instances would otherwise lock
// the thread in one macrotask. On hitting it the pass aborts with the
// depth error; the remainder stays queued (never dropped) and the next
// triggered flush continues it.
const MAX_TASKS_PER_FLUSH = 50000;
// "The queue did not shrink between sync passes" is what runaway means for
// a flushTapSync drain; this many in a row throws (finite batches always
// shrink, so they never hit it).
const MAX_CAP_STREAK = 3;
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

  /** @internal Called when the run guard drops a scheduler, so the root is not left permanently dirty (which would stall its own publishing). */
  clearDirty() {
    this._isDirty = false;
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

export const throwCollectedErrors = (errors: unknown[]): void => {
  if (errors.length === 1) {
    throw errors[0];
  }
  if (errors.length > 1) {
    for (const error of errors) {
      console.error(error);
    }
    throw new AggregateError(errors, "Errors occurred during flushSync");
  }
};

// Drains flushState.schedulers (Set iteration also visits schedulers
// re-added mid-pass, so bulk updates of any size land in a single batch)
// and appends failures to `errors` instead of throwing. Termination is
// guaranteed by the two guards: every scheduler runs at most
// MAX_TASK_RUNS_PER_FLUSH times, and the pass aborts at MAX_TASKS_PER_FLUSH
// tasks, keeping the remainder queued for the next triggered flush.
const flushScheduled = (errors: CollectedErrors, defer = true): number => {
  const runCounts = new Map<UpdateScheduler, number>();
  const errorContributors = new Set<UpdateScheduler>();
  let taskCount = 0;

  try {
    for (const scheduler of flushState.schedulers) {
      if (taskCount >= MAX_TASKS_PER_FLUSH) {
        // The per-pass ceiling only reports on the macrotask path; a sync
        // caller chunks silently and applies its own total ceiling.
        if (defer) {
          reportDepthError(errors);
        }
        break;
      }
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      const runs = (runCounts.get(scheduler) ?? 0) + 1;
      if (runs > MAX_TASK_RUNS_PER_FLUSH) {
        reportDepthError(errors);
        // Dropped, but not left dirty: a stale isDirty would stall the
        // root's own publishing and re-burn 50 runs on every later
        // markDirty.
        scheduler.clearDirty();
        continue;
      }
      runCounts.set(scheduler, runs);
      taskCount += 1;

      try {
        scheduler.runTask();
      } catch (error) {
        // A task that throws deterministically on every re-run contributes
        // one entry, without hiding a different scheduler's failure.
        if (!errorContributors.has(scheduler)) {
          errorContributors.add(scheduler);
          errors.push(error);
        }
      }
    }
  } finally {
    if (defer) {
      flushState.isScheduled = false;
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

  try {
    const value = callback();
    // Synchronous callers rely on every notification having landed by the
    // time this returns, so drain across passes until the queue is empty;
    // a runaway is bounded by the same task ceiling (checked before each
    // pass, so finite batches always finish first).
    const errors: CollectedErrors = [];
    // A finite batch's queue always shrinks between passes; only a runaway
    // (fresh schedulers minted mid-drain) fails to. The sync ceiling
    // therefore counts non-shrinking passes, and finite batches of any
    // size always finish first.
    let lastQueueSize = Number.POSITIVE_INFINITY;
    let streak = 0;
    while (flushState.schedulers.size > 0) {
      if (streak > MAX_CAP_STREAK) {
        reportDepthError(errors);
        break;
      }
      flushScheduled(errors, false);
      const size = flushState.schedulers.size;
      streak = size >= lastQueueSize ? streak + 1 : 0;
      lastQueueSize = size;
    }
    throwCollectedErrors(errors);

    return value;
  } finally {
    flushState = prev;
  }
};
