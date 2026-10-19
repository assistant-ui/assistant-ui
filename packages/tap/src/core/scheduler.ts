import { throwAggregated } from "./helpers/throwAggregated";
import { isDevelopment } from "./helpers/env";

type ErrorHandler = (error: unknown) => void;
type Task = { run: () => void; onError: ErrorHandler | undefined };
type Notify = { run: () => void; onError: ErrorHandler | undefined };

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  tasks: Task[];
  notifies: Notify[];
  isScheduled: boolean;
};

const MAX_UPDATE_DEPTH = 50;
let flushState: GlobalFlushState = {
  schedulers: new Set(),
  tasks: [],
  notifies: [],
  isScheduled: false,
};
let activeDrainRuns: Map<UpdateScheduler, number> | null = null;
let asyncFlushErrors: unknown[] | undefined;

export class UpdateScheduler {
  private _isDirty = false;

  private readonly _task: () => void;
  readonly onError: ErrorHandler | undefined;

  constructor(task: () => void, onError?: ErrorHandler) {
    this._task = task;
    this.onError = onError;
  }

  get isDirty() {
    return this._isDirty;
  }

  markDirty() {
    if (
      activeDrainRuns &&
      (activeDrainRuns.get(this) ?? 0) >= MAX_UPDATE_DEPTH
    ) {
      throw new Error(
        `Maximum update depth exceeded. This can happen when a resource ` +
          `repeatedly calls setState inside useEffect.`,
      );
    }

    this._isDirty = true;

    flushState.schedulers.add(this);
    scheduleFlush();
  }

  runTask() {
    activeDrainRuns?.set(this, (activeDrainRuns.get(this) ?? 0) + 1);

    this._isDirty = false;
    this._task();
  }

  settle() {
    this._isDirty = false;
  }
}

const taskScheduler = new UpdateScheduler(() => {
  const tasks = flushState.tasks.splice(0);
  const errors: unknown[] = [];
  for (const { run, onError } of tasks) {
    try {
      run();
    } catch (error) {
      if (asyncFlushErrors && onError) {
        try {
          onError(error);
        } catch (handlerError) {
          errors.push(handlerError);
        }
      } else {
        errors.push(error);
      }
    }
  }
  throwAggregated(errors, "Errors occurred while running scheduled tasks");
});

export const scheduleTask = (run: () => void, onError?: ErrorHandler): void => {
  taskScheduler.markDirty();
  flushState.tasks.push({ run, onError });
};

export const scheduleNotify = (
  notify: () => void,
  onError?: ErrorHandler,
): void => {
  if (activeDrainRuns !== null) {
    flushState.notifies.push({ run: notify, onError });
    return;
  }
  notify();
};

const scheduleFlush = () => {
  if (flushState.isScheduled) return;
  flushState.isScheduled = true;
  scheduleMacrotask();
};

const flushScheduled = (isAsync = false) => {
  // save/restore: flushTapSync re-enters flushScheduled with its own flushState
  const prevDrainRuns = activeDrainRuns;
  const prevAsyncFlushErrors = asyncFlushErrors;
  const errors: unknown[] = [];
  activeDrainRuns = new Map();
  asyncFlushErrors = isAsync ? errors : undefined;
  try {
    for (const scheduler of flushState.schedulers) {
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      try {
        scheduler.runTask();
      } catch (error) {
        if (isAsync && scheduler.onError) {
          try {
            scheduler.onError(error);
          } catch (handlerError) {
            errors.push(handlerError);
          }
        } else {
          errors.push(error);
        }
      }
    }
  } finally {
    activeDrainRuns = prevDrainRuns;
    asyncFlushErrors = prevAsyncFlushErrors;
    flushState.schedulers.clear();
    flushState.isScheduled = false;

    if (activeDrainRuns === null) {
      const notifies = flushState.notifies;
      while (notifies.length > 0) {
        const { run, onError } = notifies.shift()!;
        try {
          run();
        } catch (error) {
          if (isAsync && onError) {
            try {
              onError(error);
            } catch (handlerError) {
              errors.push(handlerError);
            }
          } else {
            errors.push(error);
          }
        }
      }
    }
  }
  throwAggregated(errors, "Errors occurred during flushSync");
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
          flushScheduled(true);
        };
        port1 = channel.port1;
        port2 = channel.port2;
      }
      port1.ref?.();
      port2!.postMessage(null);
    };
  }
  // Fallback for environments without MessageChannel
  return () => setTimeout(() => flushScheduled(true), 0);
})();

export const flushTapSync = <T>(callback: () => T): T => {
  if (activeDrainRuns !== null) {
    if (isDevelopment) {
      console.warn(
        "flushTapSync was called from inside a render or commit. " +
          "The flush is deferred until the current pass completes.",
      );
    }
    return callback();
  }

  const prev = flushState;
  flushState = {
    schedulers: new Set(),
    tasks: [],
    notifies: [],
    isScheduled: true,
  };

  try {
    const value = callback();
    flushScheduled();

    return value;
  } finally {
    // The notify drain at the end of flushScheduled runs while flushState
    // still points at the temporary state, so a markDirty or scheduleTask
    // from a notify lands there. Hand that work to the restored state or it
    // is lost.
    const stranded = flushState;
    flushState = prev;
    for (const task of stranded.tasks) flushState.tasks.push(task);
    // taskScheduler is shared by every flush state, and running it here
    // cleared the dirty bit the restored state relies on.
    if (flushState.tasks.length > 0) taskScheduler.markDirty();
    if (stranded.schedulers.size > 0) {
      for (const scheduler of stranded.schedulers)
        flushState.schedulers.add(scheduler);
      scheduleFlush();
    }
  }
};
