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
  queueMicrotask(flushScheduled);
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
        throw new AggregateError(errors, "Errors occurred during flushSync");
      }
    }
  } finally {
    flushState.schedulers.clear();
    flushState.isScheduled = false;
  }
};

export const flushSync = <T>(callback: () => T): T => {
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
