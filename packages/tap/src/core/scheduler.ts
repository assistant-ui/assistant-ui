type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  // How often each scheduler has run since the queue last drained. A
  // scheduler re-run more than MAX_TASK_RUNS_PER_BURST times within one
  // burst is an infinite update loop; finite batches (even huge ones)
  // never re-run a scheduler, so they are never subject to a total-size
  // ceiling.
  runCounts: Map<UpdateScheduler, number>;
  isScheduled: boolean;
};

const newFlushState = (): GlobalFlushState => ({
  schedulers: new Set([]),
  runCounts: new Map(),
  isScheduled: false,
});

// Maximum number of tasks a single flush pass may run. Bounds the work done
// in one macrotask and, because Set iteration also visits schedulers
// re-added mid-pass, prevents an infinite loop from hanging a single pass.
const MAX_FLUSH_LIMIT = 50;
// Guard against true infinite update loops: a resource that keeps
// re-dirtying itself (or a cycle of resources re-dirtying each other)
// re-runs the same scheduler more than this many times within one burst.
const MAX_TASK_RUNS_PER_BURST = 50;
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

// Runs at most MAX_FLUSH_LIMIT tasks from flushState.schedulers. Throws on
// task errors (discarding the rest of the batch) and on infinite loops.
const runFlushPass = () => {
  const errors: unknown[] = [];
  let flushDepth = 0;

  for (const scheduler of flushState.schedulers) {
    if (flushDepth >= MAX_FLUSH_LIMIT) break;
    flushState.schedulers.delete(scheduler);
    if (!scheduler.isDirty) continue;

    flushDepth++;

    const runs = (flushState.runCounts.get(scheduler) ?? 0) + 1;
    flushState.runCounts.set(scheduler, runs);
    if (runs > MAX_TASK_RUNS_PER_BURST) {
      flushState.schedulers.clear();
      throw new Error(
        `Maximum update depth exceeded. This can happen when a resource ` +
          `repeatedly calls setState inside useEffect.`,
      );
    }

    try {
      scheduler.runTask();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    flushState.schedulers.clear();
    if (errors.length === 1) {
      throw errors[0];
    } else {
      for (const error of errors) {
        console.error(error);
      }
      throw new AggregateError(errors, "Errors occurred during flushSync");
    }
  }
};

const flushScheduled = () => {
  try {
    runFlushPass();

    if (flushState.schedulers.size > 0) {
      // Large batches (e.g. hundreds of resources mounting in one update)
      // overflow a single pass; defer the rest to a follow-up pass instead
      // of dropping them.
      flushState.isScheduled = false;
      scheduleFlush();
      return;
    }

    flushState.runCounts.clear();
    flushState.isScheduled = false;
  } catch (error) {
    flushState.runCounts.clear();
    flushState.isScheduled = false;
    throw error;
  }
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
          flushScheduled();
        };
        port1 = channel.port1;
        port2 = channel.port2;
      }
      port1.ref?.();
      port2!.postMessage(null);
    };
  }
  // Fallback for environments without MessageChannel
  return () => setTimeout(flushScheduled, 0);
})();

export const flushTapSync = <T>(callback: () => T): T => {
  const prev = flushState;
  flushState = newFlushState();
  flushState.isScheduled = true;

  try {
    const value = callback();
    // Synchronous callers rely on every notification having landed by the
    // time this returns, so drain across passes until the queue is empty
    // (or the loop guard fires) instead of deferring to a macrotask.
    while (flushState.schedulers.size > 0) {
      runFlushPass();
    }

    return value;
  } finally {
    flushState = prev;
  }
};
