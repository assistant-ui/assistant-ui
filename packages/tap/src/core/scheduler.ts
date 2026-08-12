import { throwAggregated } from "./helpers/throwAggregated";
import { isDevelopment } from "./helpers/env";

type Task = () => void;

let reconcileDepth = 0;

// Renders never nest, they queue: dispatches made while a render or commit is
// on the stack must not synchronously re-enter the work loop.
export const isReconciling = () => reconcileDepth > 0;

export const withReconcileScope = <T>(fn: () => T): T => {
  reconcileDepth++;
  try {
    return fn();
  } finally {
    reconcileDepth--;
  }
};

type GlobalFlushState = {
  schedulers: Set<UpdateScheduler>;
  isScheduled: boolean;
};

const MAX_UPDATE_DEPTH = 50;
let flushState: GlobalFlushState = {
  schedulers: new Set([]),
  isScheduled: false,
};
let activeDrainRuns: Map<UpdateScheduler, number> | null = null;

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
}

const scheduleFlush = () => {
  if (flushState.isScheduled) return;
  flushState.isScheduled = true;
  scheduleMacrotask();
};

const flushScheduled = () => {
  // save/restore: flushTapSync re-enters flushScheduled with its own flushState
  const prevDrainRuns = activeDrainRuns;
  activeDrainRuns = new Map();
  try {
    const errors = [];

    for (const scheduler of flushState.schedulers) {
      flushState.schedulers.delete(scheduler);
      if (!scheduler.isDirty) continue;

      try {
        scheduler.runTask();
      } catch (error) {
        errors.push(error);
      }
    }

    throwAggregated(errors, "Errors occurred during flushSync");
  } finally {
    activeDrainRuns = prevDrainRuns;
    flushState.schedulers.clear();
    flushState.isScheduled = false;
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
  // Mirrors React's flushSync-inside-lifecycle rule: never flush while a
  // render or commit is on the stack. The callback's dispatches land in the
  // enclosing flush state and drain after the current pass.
  if (reconcileDepth > 0) {
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
