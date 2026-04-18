type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  isScheduled: boolean;
};

const MAX_FLUSH_LIMIT = 50;
let flushState: GlobalFlushState = {
  schedulers: new Set([]),
  isScheduled: false,
};

export class UpdateScheduler {
  private _isDirty = false;

  constructor(private readonly _task: Task) {}

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

const flushScheduled = () => {
  try {
    const errors = [];
    let flushDepth = 0;

    for (const scheduler of flushState.schedulers) {
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      flushDepth++;

      if (flushDepth > MAX_FLUSH_LIMIT) {
        throw new Error(
          `Maximum update depth exceeded. This can happen when a resource ` +
            `repeatedly calls setState inside tapEffect.`,
        );
      }

      try {
        scheduler.runTask();
      } catch (error) {
        errors.push(error);
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
  } finally {
    flushState.schedulers.clear();
    flushState.isScheduled = false;
  }
};

// Use MessageChannel to schedule flushes as macrotasks (like React's scheduler).
// This allows more state updates to batch into a single re-render.
const scheduleMacrotask = (() => {
  if (typeof MessageChannel !== "undefined") {
    const channel = new MessageChannel();
    channel.port1.onmessage = flushScheduled;
    return () => channel.port2.postMessage(null);
  }
  // Fallback for environments without MessageChannel
  return () => setTimeout(flushScheduled, 0);
})();

export const flushResourcesSync = <T>(callback: () => T): T => {
  const prev = flushState;
  flushState = {
    schedulers: new Set([]),
    isScheduled: true,
  };

  try {
    const result = callback();
    flushScheduled();

    return result;
  } finally {
    flushState = prev;
  }
};
