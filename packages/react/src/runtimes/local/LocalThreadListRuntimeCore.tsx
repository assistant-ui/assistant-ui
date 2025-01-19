import type { Unsubscribe } from "../../types";
import { ThreadListRuntimeCore } from "../core/ThreadListRuntimeCore";
import { generateId } from "../../utils/idUtils";
import { LocalThreadRuntimeCore } from "./LocalThreadRuntimeCore";

export type ThreadListAdapter = {
  subscribe(callback: () => void): Unsubscribe;
};

export type LocalThreadData = {
  readonly runtime: LocalThreadRuntimeCore;
  readonly status: "new" | "regular" | "archived";
  readonly threadId: string;
  readonly title?: string | undefined;
};

export type LocalThreadFactory = () => LocalThreadRuntimeCore;

const RESOLVED_PROMISE = Promise.resolve();
export class LocalThreadListRuntimeCore implements ThreadListRuntimeCore {
  private _threadData = new Map<string, LocalThreadData>();
  private _threadIds: readonly string[] = [];
  private _archivedThreadIds: readonly string[] = [];
  private _newThreadId: string | undefined;

  public get newThreadId() {
    return this._newThreadId;
  }

  public get threadIds() {
    return this._threadIds;
  }

  public get archivedThreadIds() {
    return this._archivedThreadIds;
  }

  private _mainThreadId!: string;

  public get mainThreadId(): string {
    return this._mainThreadId;
  }

  constructor(private _threadFactory: LocalThreadFactory) {
    this.switchToNewThread();
  }

  public getMainThreadRuntimeCore() {
    const result = this._threadData.get(this._mainThreadId)?.runtime;
    if (!result)
      throw new Error("Main thread not found. This is a bug in assistant-ui.");
    return result;
  }

  public getThreadRuntimeCore(threadId: string) {
    const result = this._threadData.get(threadId)?.runtime;
    if (!result) throw new Error("Thread not found.");
    return result;
  }

  public getLoadThreadsPromise(): Promise<void> {
    return RESOLVED_PROMISE;
  }

  public getItemById(threadId: string) {
    return this._threadData.get(threadId);
  }

  public async switchToThread(threadId: string): Promise<void> {
    if (this._mainThreadId === threadId) return;

    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    if (data.status === "archived") await this.unarchive(threadId);

    this._mainThreadId = data.threadId;
    this._notifySubscribers();
  }

  public switchToNewThread(): Promise<void> {
    if (this._newThreadId === undefined) {
      let threadId: string;
      do {
        threadId = generateId();
      } while (this._threadData.has(threadId));

      const runtime = this._threadFactory();
      const dispose = runtime.unstable_on("initialize", () => {
        dispose();
        const data = this._threadData.get(threadId);
        if (!data) throw new Error("Thread not found");

        this._stateOp(threadId, "regular");
      });
      this._threadData.set(threadId, {
        runtime,
        status: "new",
        threadId,
      });
      this._newThreadId = threadId;
    }

    this.switchToThread(this._newThreadId);
    return Promise.resolve();
  }

  private async _stateOp(
    threadId: string,
    newState: "regular" | "archived" | "deleted",
  ) {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    const { status: lastState } = data;
    if (lastState === newState) return;

    // lastState
    switch (lastState) {
      case "new":
        this._newThreadId = undefined;
        break;
      case "regular":
        this._threadIds = this._threadIds.filter((t) => t !== threadId);
        break;
      case "archived":
        this._archivedThreadIds = this._archivedThreadIds.filter(
          (t) => t !== threadId,
        );
        break;

      default: {
        const _exhaustiveCheck: never = lastState;
        throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
      }
    }

    // newState
    switch (newState) {
      case "regular":
        this._threadIds = [data.threadId, ...this._threadIds];
        break;

      case "archived":
        this._archivedThreadIds = [data.threadId, ...this._archivedThreadIds];
        break;

      case "deleted":
        this._threadData.delete(threadId);
        break;

      default: {
        const _exhaustiveCheck: never = newState;
        throw new Error(`Unsupported state: ${_exhaustiveCheck}`);
      }
    }

    if (newState !== "deleted") {
      this._threadData.set(threadId, {
        ...data,
        status: newState,
      });
    }

    if (
      threadId === this._mainThreadId &&
      (newState === "archived" || newState === "deleted")
    ) {
      const lastThreadId = this._threadIds[0];
      if (lastThreadId) {
        await this.switchToThread(lastThreadId);
      } else {
        await this.switchToNewThread();
      }
    } else {
      this._notifySubscribers();
    }
  }

  public rename(threadId: string, newTitle: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    this._threadData.set(threadId, {
      ...data,
      title: newTitle,
    });
    this._notifySubscribers();
    return Promise.resolve();
  }

  public archive(threadId: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular")
      throw new Error("Thread is not yet initialized or already archived");

    this._stateOp(threadId, "archived");
    return Promise.resolve();
  }

  public unarchive(threadId: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "archived") throw new Error("Thread is not archived");

    this._stateOp(threadId, "regular");
    return Promise.resolve();
  }

  public delete(threadId: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.status !== "regular" && data.status !== "archived")
      throw new Error("Thread is not yet initialized");

    this._stateOp(threadId, "deleted");
    return Promise.resolve();
  }

  private _subscriptions = new Set<() => void>();

  public subscribe(callback: () => void): Unsubscribe {
    this._subscriptions.add(callback);
    return () => this._subscriptions.delete(callback);
  }

  private _notifySubscribers() {
    for (const callback of this._subscriptions) callback();
  }
}
