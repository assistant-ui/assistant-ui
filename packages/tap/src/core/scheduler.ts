import { throwAggregated } from "./helpers/throwAggregated";
import { isDevelopment } from "./helpers/env";

type Task = () => void;

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  isScheduled: boolean;
};

const MAX_UPDATE_DEPTH = 50;
let flushState: GlobalFlushState = {
  schedulers: new Set(),
  isScheduled: false,
};
let activeDrainRuns: Map<UpdateScheduler, number> | null = null;
const pendingNotifies: (() => void)[] = [];

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

type TaskState = {
  tasks: Task[];
  scheduler: UpdateScheduler;
};

const createTaskState = (): TaskState => {
  const tasks: Task[] = [];
  return {
    tasks,
    scheduler: new UpdateScheduler(() => {
      const batch = tasks.splice(0);
      const errors: unknown[] = [];
      for (const task of batch) {
        try {
          task();
        } catch (error) {
          errors.push(error);
        }
      }
      throwAggregated(errors, "Errors occurred while running scheduled tasks");
    }),
  };
};

let taskState = createTaskState();

export const scheduleTask = (task: Task): void => {
  taskState.scheduler.markDirty();
  taskState.tasks.push(task);
};

export const scheduleNotify = (notify: () => void): void => {
  if (activeDrainRuns !== null) {
    pendingNotifies.push(notify);
    return;
  }
  notify();
};

const scheduleFlush = () => {
  if (flushState.isScheduled) return;
  flushState.isScheduled = true;
  scheduleMacrotask();
};

const flushScheduled = () => {
  // save/restore: flushTapSync re-enters flushScheduled with its own flushState
  const prevDrainRuns = activeDrainRuns;
  activeDrainRuns = new Map();
  const errors: unknown[] = [];
  try {
    for (const scheduler of flushState.schedulers) {
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      try {
        scheduler.runTask();
      } catch (error) {
        errors.push(error);
      }
    }
  } finally {
    activeDrainRuns = prevDrainRuns;
    flushState.schedulers.clear();
    flushState.isScheduled = false;

    if (activeDrainRuns === null) {
      while (pendingNotifies.length > 0) {
        try {
          pendingNotifies.shift()!();
        } catch (error) {
          errors.push(error);
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
  const prevTaskState = taskState;
  flushState = {
    schedulers: new Set(),
    isScheduled: true,
  };
  taskState = createTaskState();

  try {
    const value = callback();
    flushScheduled();

    return value;
  } finally {
    // The notify drain at the end of flushScheduled runs while flushState
    // still points at the temporary state, so a markDirty from a notify
    // lands there. Hand that work to the restored state or it is lost.
    const stranded = flushState.schedulers;
    flushState = prev;
    taskState = prevTaskState;
    if (stranded.size > 0) {
      for (const scheduler of stranded) flushState.schedulers.add(scheduler);
      scheduleFlush();
    }
  }
};
