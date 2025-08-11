type Task = () => void;

let queue: Task[] = [];
let isFlushPending = false;

function flushQueue() {
  isFlushPending = false;

  const tasksToRun = queue;
  queue = [];

  for (const task of tasksToRun) {
    try {
      task();
    } catch (error) {
      console.error("Error in scheduled task:", error);
    }
  }
}

function scheduleUpdate(task: Task) {
  queue.push(task);

  if (!isFlushPending) {
    isFlushPending = true;
    queueMicrotask(flushQueue);
  }
}

export class UpdateScheduler {
  private _isDirty = false;
  private _hasScheduledTask = false;
  private _isFlushing = false;
  private static readonly MAX_FLUSH_DEPTH = 50;

  constructor(private readonly _task: Task) {}

  get isDirty() {
    return this._isDirty;
  }

  markDirty() {
    this._isDirty = true;

    if (this._hasScheduledTask || this._isFlushing) return;
    this._hasScheduledTask = true;

    scheduleUpdate(() => {
      this._hasScheduledTask = false;

      this.flushSync();
    });
  }

  flushSync() {
    if (this._isFlushing) return;

    this._isFlushing = true;
    let flushDepth = 0;

    try {
      while (this._isDirty) {
        flushDepth++;

        if (flushDepth > UpdateScheduler.MAX_FLUSH_DEPTH) {
          throw new Error(
            `Maximum update depth exceeded. This can happen when a resource ` +
              `repeatedly calls setState inside tapEffect.`
          );
        }

        this._isDirty = false;
        this._task();
      }
    } finally {
      this._isFlushing = false;
    }
  }

}
