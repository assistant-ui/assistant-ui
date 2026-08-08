import { throwAggregated } from "./helpers/throwAggregated";

type Task = () => void;

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

const drainScheduled = (): unknown[] => {
  // save/restore: flushTapSync re-enters the drain with its own flushState
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

    return errors;
  } finally {
    activeDrainRuns = prevDrainRuns;
    flushState.schedulers.clear();
    flushState.isScheduled = false;
  }
};

const flushScheduled = () => {
  throwAggregated(drainScheduled(), "Errors occurred during flushSync");
};

// A scheduled flush runs with an empty stack above it, so an escaping error is
// an uncaught error in the browser and an uncaughtException (process exit) in
// Node, SSR and react-ink. Reporting the drained errors directly also keeps
// each one to a single line, which routing them through throwAggregated would
// not. flushTapSync still rethrows, because its caller is there to absorb it.
const flushFromTask = () => {
  for (const error of drainScheduled()) console.error(error);
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
          flushFromTask();
        };
        port1 = channel.port1;
        port2 = channel.port2;
      }
      port1.ref?.();
      port2!.postMessage(null);
    };
  }
  // Fallback for environments without MessageChannel
  return () => setTimeout(flushFromTask, 0);
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
