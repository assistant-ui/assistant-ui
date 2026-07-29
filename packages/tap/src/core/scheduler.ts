type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  // How often each scheduler has run, and how many tasks have run in total,
  // since the queue last drained. Cleared whenever a flush finishes, whether
  // it drained or aborted on a guard.
  runCounts: Map<UpdateScheduler, number>;
  taskCount: number;
  isScheduled: boolean;
};

const newFlushState = (): GlobalFlushState => ({
  schedulers: new Set([]),
  runCounts: new Map(),
  taskCount: 0,
  isScheduled: false,
});

// Per-scheduler loop guard: a scheduler re-run more than this many times
// within a single burst (before the queue ever drains) is a resource that
// keeps re-dirtying itself, or a cycle of resources re-dirtying each other.
// Finite batches never hit this regardless of size, because every scheduler
// in them runs a bounded number of times. The bound is real, though: a
// genuinely self-dependent cascade deeper than this many re-runs in one
// burst (each run queueing the same scheduler again) is indistinguishable
// from a loop and will also throw.
const MAX_TASK_RUNS_PER_BURST = 50;
// Burst-wide backstop: a cascade that keeps queueing NEW schedulers never
// trips the per-scheduler guard (each instance runs once), so without a
// total cap it would monopolize the macrotask forever. Sized far above any
// realistic bulk update; only a genuinely unbounded cascade reaches it.
const MAX_TOTAL_TASKS_PER_BURST = 10000;
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

// Drains flushState.schedulers completely. Set iteration also visits
// schedulers re-added mid-pass, so bulk updates of any size land in a
// single batch (one React commit, no intermediate paints). A pass always
// terminates: the per-scheduler guard bounds re-runs of one scheduler, and
// the burst-wide task cap bounds cascades of fresh ones, so a pass executes
// at most MAX_TOTAL_TASKS_PER_BURST tasks.
const flushScheduled = () => {
  const errors: unknown[] = [];

  try {
    for (const scheduler of flushState.schedulers) {
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      flushState.taskCount += 1;
      if (flushState.taskCount > MAX_TOTAL_TASKS_PER_BURST) {
        throw new Error(
          `Maximum update depth exceeded. This can happen when a resource ` +
            `repeatedly calls setState inside useEffect.`,
        );
      }

      const runs = (flushState.runCounts.get(scheduler) ?? 0) + 1;
      flushState.runCounts.set(scheduler, runs);
      if (runs > MAX_TASK_RUNS_PER_BURST) {
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
  } finally {
    flushState.schedulers.clear();
    flushState.runCounts.clear();
    flushState.taskCount = 0;
    flushState.isScheduled = false;
  }

  if (errors.length > 0) {
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
    flushScheduled();

    return value;
  } finally {
    flushState = prev;
  }
};
