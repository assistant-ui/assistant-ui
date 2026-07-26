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
// The channel is created on first use: an open MessagePort holds the Node
// event loop open, so merely importing tap must not create one.
const scheduleMacrotask = (() => {
  if (typeof MessageChannel !== "undefined") {
    let port2: MessagePort | undefined;
    return () => {
      if (!port2) {
        const channel = new MessageChannel();
        channel.port1.onmessage = flushScheduled;
        port2 = channel.port2;
      }
      port2.postMessage(null);
    };
  }
  // Fallback for environments without MessageChannel
  return () => setTimeout(flushScheduled, 0);
})();

export const flushTapSync = <T>(callback: () => T): T => {
  const prev = flushState;
  flushState = {
    schedulers: new Set([]),
    isScheduled: true,
  };

  try {
    const value = callback();
    flushScheduled();

    return value;
  } finally {
    flushState = prev;
  }
};
