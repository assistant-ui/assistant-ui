type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  isScheduled: boolean;
};

// Maximum number of tasks a single flush pass may run. Large legitimate
// batches (e.g. hundreds of resources mounting in one update) exceed this
// easily, so overflowing work is deferred to follow-up passes instead of
// being dropped.
const MAX_FLUSH_LIMIT = 50;
// Guard against true infinite update loops (a resource that re-dirties
// itself on every run): if this many consecutive passes stay saturated
// without the queue ever draining, give up and throw.
const MAX_SATURATED_FLUSH_PASSES = 100;
let flushState: GlobalFlushState = {
  schedulers: new Set([]),
  isScheduled: false,
};
let saturatedFlushPasses = 0;

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

const flushScheduled = () => {
  const errors = [];
  let flushDepth = 0;

  for (const scheduler of flushState.schedulers) {
    if (flushDepth >= MAX_FLUSH_LIMIT) break;
    flushState.schedulers.delete(scheduler);
    if (!scheduler.isDirty) continue;

    flushDepth++;

    try {
      scheduler.runTask();
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    flushState.schedulers.clear();
    flushState.isScheduled = false;
    saturatedFlushPasses = 0;
    if (errors.length === 1) {
      throw errors[0];
    } else {
      for (const error of errors) {
        console.error(error);
      }
      throw new AggregateError(errors, "Errors occurred during flushSync");
    }
  }

  if (flushState.schedulers.size > 0) {
    saturatedFlushPasses += 1;
    if (saturatedFlushPasses >= MAX_SATURATED_FLUSH_PASSES) {
      flushState.schedulers.clear();
      flushState.isScheduled = false;
      saturatedFlushPasses = 0;
      throw new Error(
        `Maximum update depth exceeded. This can happen when a resource ` +
          `repeatedly calls setState inside useEffect.`,
      );
    }
    // More work remains: continue draining in the next pass instead of
    // dropping the pending updates.
    flushState.isScheduled = false;
    scheduleFlush();
    return;
  }

  saturatedFlushPasses = 0;
  flushState.isScheduled = false;
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
