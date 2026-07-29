type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
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

// Per-scheduler re-runs catch resources that re-dirty themselves or each
// other in a loop; a finite batch never re-runs one scheduler this often.
const MAX_TASK_RUNS_PER_BURST = 50;
// Backstop for cascades of FRESH schedulers (each runs once, so the
// per-scheduler guard never trips); sized far above realistic bulk updates.
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

// Guards throw loudly but never drop queued work: the remainder stays
// queued and continues on the next flush.
const flushScheduled = () => {
  const errors: unknown[] = [];

  try {
    for (const scheduler of flushState.schedulers) {
      if (flushState.taskCount >= MAX_TOTAL_TASKS_PER_BURST) {
        throw new Error(
          `Maximum update depth exceeded. This can happen when a resource ` +
            `repeatedly calls setState inside useEffect.`,
        );
      }
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      const runs = (flushState.runCounts.get(scheduler) ?? 0) + 1;
      if (runs > MAX_TASK_RUNS_PER_BURST) {
        flushState.schedulers.add(scheduler);
        throw new Error(
          `Maximum update depth exceeded. This can happen when a resource ` +
            `repeatedly calls setState inside useEffect.`,
        );
      }
      flushState.runCounts.set(scheduler, runs);
      flushState.taskCount += 1;

      try {
        scheduler.runTask();
      } catch (error) {
        errors.push(error);
      }
    }

    flushState.runCounts.clear();
    if (errors.length > 0) {
      flushState.schedulers.clear();
    }
  } finally {
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
