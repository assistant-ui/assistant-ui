type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  // Queue size at the previous cap abort (Infinity before the first one).
  lastCapQueueSize: number;
  capStreak: number;
  isScheduled: boolean;
};

const newFlushState = (): GlobalFlushState => ({
  schedulers: new Set([]),
  lastCapQueueSize: Number.POSITIVE_INFINITY,
  capStreak: 0,
  isScheduled: false,
});

// Per-scheduler re-runs catch resources that re-dirty themselves or each
// other in a loop; a finite batch never re-runs one scheduler this often.
// (createTapRoot allocates a fresh UpdateScheduler per dispatch, so this
// never fires for that root type - the burst cap is the guard there.)
const MAX_TASK_RUNS_PER_BURST = 50;
// A flush yields silently at this many tasks and continues on the next
// macrotask, so oversized batches drain across flushes with no error. It is
// also the hard ceiling for a single flushTapSync call, where there is no
// next macrotask to yield to.
const MAX_TOTAL_TASKS_PER_BURST = 10000;
// "The queue did not shrink between cap aborts" is what cascade means for
// the burst cap (a finite batch's queue always shrinks; a runaway's never
// does). This many non-shrinking aborts in a row throws and stops
// auto-continuing. Legitimate batches of any size never hit it.
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

// Guards never lose queued work silently: the burst cap yields and
// reschedules, so oversized batches drain across macrotasks with no error;
// a cascade (queue not shrinking between cap aborts) throws after
// MAX_CAP_STREAK and stops auto-continuing; a loop abort clears the queue,
// which is the only way a mutually re-dirtying ring terminates.
const flushScheduled = (defer = true): number => {
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
    const remaining = flushState.schedulers.size;
    flushState.capStreak =
      remaining >= flushState.lastCapQueueSize ? flushState.capStreak + 1 : 0;
    flushState.lastCapQueueSize = remaining;
    if (flushState.capStreak > MAX_CAP_STREAK) {
      // Runaway cascade: report once and stop auto-continuing, but keep the
      // queue and judge the next burst fresh (no latched streak).
      flushState.capStreak = 0;
      flushState.lastCapQueueSize = Number.POSITIVE_INFINITY;
      throw new Error(
        `Maximum update depth exceeded. This can happen when a resource ` +
          `repeatedly calls setState inside useEffect.`,
      );
    }
    if (defer) {
      scheduleFlush();
    }
  } else {
    flushState.capStreak = 0;
    flushState.lastCapQueueSize = Number.POSITIVE_INFINITY;
    if (abort === "loop") {
      flushState.schedulers.clear();
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

  return taskCount;
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
    // time this returns, so drain across passes until the queue is empty.
    // There is no next macrotask to yield to here, so the burst cap is a
    // hard ceiling instead of a yield boundary.
    let total = 0;
    while (flushState.schedulers.size > 0) {
      total += flushScheduled(false);
      if (total > MAX_TOTAL_TASKS_PER_BURST) {
        throw new Error(
          `Maximum update depth exceeded. This can happen when a resource ` +
            `repeatedly calls setState inside useEffect.`,
        );
      }
    }

    return value;
  } finally {
    flushState = prev;
  }
};
