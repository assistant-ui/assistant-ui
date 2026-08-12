import { throwAggregated } from "./helpers/throwAggregated";
import { isDevelopment } from "./helpers/env";

type Task = () => void;

// Renders never nest, they queue. The scheduler is the tap-root work loop,
// so it enforces the rule for the passes it drives: while a flush is on the
// stack (a scheduled drain or a flushTapSync callback), a nested flushTapSync
// defers instead of re-entering. React-hosted fibers are driven by React's
// work loop, which enforces the same rule itself — they pay no cost here.
let isFlushing = false;

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
  const prevIsFlushing = isFlushing;
  activeDrainRuns = new Map();
  isFlushing = true;
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
    isFlushing = prevIsFlushing;
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
  // pass is already on the stack. The callback's dispatches land in the
  // enclosing flush state and drain after the current pass.
  if (isFlushing) {
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
  // The callback itself is part of the flush: tap roots run their commits
  // inside it, so effects dispatching here must not re-enter.
  isFlushing = true;

  try {
    const value = callback();
    flushScheduled();

    return value;
  } finally {
    isFlushing = false;
    flushState = prev;
  }
};
