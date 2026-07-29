type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  capStreak: number;
  isScheduled: boolean;
};

const newFlushState = (): GlobalFlushState => ({
  schedulers: new Set([]),
  capStreak: 0,
  isScheduled: false,
});

// Per-scheduler re-runs catch resources that re-dirty themselves or each
// other in a loop; a finite batch never re-runs one scheduler this often.
const MAX_TASK_RUNS_PER_BURST = 50;
// Backstop for cascades of FRESH schedulers (each runs once, so the
// per-scheduler guard never trips). A flush yields silently at this many
// tasks and continues on the next macrotask, so oversized batches drain
// without errors; only MAX_CAP_STREAK consecutive saturated flushes are
// treated as a runaway.
const MAX_TOTAL_TASKS_PER_BURST = 10000;
// "Saturated this many flushes in a row" is what loop means for the burst
// cap: stop auto-continuing and throw. The queue is kept — never dropped.
const MAX_CAP_STREAK = 10;
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

// Guards never drop queued work. The burst-wide cap yields silently and
// reschedules, so oversized batches drain across macrotasks with no error;
// only MAX_CAP_STREAK saturated flushes in a row (a runaway) throws and
// stops auto-continuing. A looping scheduler is dropped so the rest of the
// app keeps flushing.
const flushScheduled = () => {
  const errors: unknown[] = [];
  const runCounts = new Map<UpdateScheduler, number>();
  let taskCount = 0;
  let abort: "cap" | "loop" | null = null;

  try {
    for (const scheduler of flushState.schedulers) {
      if (taskCount >= MAX_TOTAL_TASKS_PER_BURST) {
        abort = "cap";
        break;
      }
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      const runs = (runCounts.get(scheduler) ?? 0) + 1;
      if (runs > MAX_TASK_RUNS_PER_BURST) {
        abort = "loop";
        break;
      }
      runCounts.set(scheduler, runs);
      taskCount += 1;

      try {
        scheduler.runTask();
      } catch (error) {
        errors.push(error);
      }
    }
  } finally {
    flushState.isScheduled = false;
  }

  if (abort === "cap") {
    flushState.capStreak += 1;
    if (flushState.capStreak <= MAX_CAP_STREAK) {
      scheduleFlush();
    } else {
      throw new Error(
        `Maximum update depth exceeded. This can happen when a resource ` +
          `repeatedly calls setState inside useEffect.`,
      );
    }
  } else {
    flushState.capStreak = 0;
    if (abort === "loop") {
      scheduleFlush();
      throw new Error(
        `Maximum update depth exceeded. This can happen when a resource ` +
          `repeatedly calls setState inside useEffect.`,
      );
    }
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
