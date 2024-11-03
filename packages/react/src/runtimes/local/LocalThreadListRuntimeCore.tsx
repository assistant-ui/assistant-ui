import type { Unsubscribe } from "../../types";
import { ThreadListRuntimeCore } from "../core/ThreadListRuntimeCore";
import { ExportedMessageRepository } from "../utils/MessageRepository";
import { generateId } from "../../utils/idUtils";
import { LocalThreadRuntimeCore } from "./LocalThreadRuntimeCore";
import { ThreadMetadata } from "../core/ThreadRuntimeCore";

export type LocalThreadData = {
  runtime: LocalThreadRuntimeCore;
  lastState: ThreadMetadata["state"];
  dispose: Unsubscribe;
};

export type LocalThreadFactory = (
  threadId: string,
  data: ExportedMessageRepository,
) => LocalThreadRuntimeCore;

export class LocalThreadListRuntimeCore implements ThreadListRuntimeCore {
  private _threadData = new Map<string, LocalThreadData>();
  private _threads: readonly string[] = [];
  private _archivedThreads: readonly string[] = [];
  private _newThread: string | undefined;

  public get newThread() {
    return this._newThread;
  }

  public get threads() {
    return this._threads;
  }

  public get archivedThreads() {
    return this._archivedThreads;
  }

  private _mainThread!: LocalThreadRuntimeCore;

  public get mainThread(): LocalThreadRuntimeCore {
    return this._mainThread;
  }

  constructor(private _threadFactory: LocalThreadFactory) {
    this.switchToNewThread();
  }

  public getThreadMetadataById(threadId: string) {
    return this._threadData.get(threadId)?.runtime.metadata;
  }

  public switchToThread(threadId: string): Promise<void> {
    if (this._mainThread?.metadata.threadId === threadId)
      return Promise.resolve();

    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    if (data.runtime.metadata.state === "archived") this.unarchive(threadId);

    this._mainThread?._notifyEventSubscribers("switched-away");
    this._mainThread = data.runtime;
    this._notifySubscribers();

    data.runtime._notifyEventSubscribers("switched-to");
    return Promise.resolve();
  }

  public switchToNewThread(): Promise<void> {
    if (this._newThread === undefined) {
      let threadId;
      do {
        threadId = generateId();
      } while (this._threadData.has(threadId));

      const runtime = this._threadFactory(threadId, { messages: [] });
      const dispose = runtime.unstable_on("metadata-update", () => {
        this._syncState(threadId, runtime.metadata.state);
      });
      this._threadData.set(threadId, { runtime, lastState: "new", dispose });
      this._newThread = threadId;
    }

    this.switchToThread(this._newThread);
    return Promise.resolve();
  }

  private async _syncState(
    threadId: string,
    state: "archived" | "regular" | "new" | "deleted",
  ) {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.lastState === state) return;

    if (state === "archived") {
      this._archivedThreads = [
        ...this._archivedThreads,
        data.runtime.metadata.threadId,
      ];
    }
    if (state === "regular") {
      this._threads = [...this._threads, data.runtime.metadata.threadId];
    }
    if (state === "deleted") {
      data.dispose();
      this._threadData.delete(threadId);
    }
    if (state === "new") {
      if (this._newThread) {
        this.delete(this._newThread);
      }
      this._newThread = threadId;
    }

    if (data.lastState === "regular") {
      this._threads = this._threads.filter((t) => t !== threadId);
    }

    if (data.lastState === "archived") {
      this._archivedThreads = this._archivedThreads.filter(
        (t) => t !== threadId,
      );
    }

    if (data.lastState === "new") {
      this._newThread = undefined;
    }

    data.lastState = state;
    this._notifySubscribers();

    if (
      threadId === this._mainThread.metadata.threadId &&
      (state === "archived" || state === "deleted")
    ) {
      const lastThread = this._threads[0];
      if (lastThread) {
        await this.switchToThread(lastThread);
      } else {
        await this.switchToNewThread();
      }
    }
  }

  public async rename(threadId: string, newTitle: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    data.runtime.updateMetadata({ title: newTitle });
  }

  public async archive(threadId: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.lastState !== "regular")
      throw new Error("Thread is not yet created or archived");
    data.runtime.updateMetadata({ state: "archived" });
  }

  public unarchive(threadId: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.lastState !== "archived")
      throw new Error("Thread is not archived");
    data.runtime.updateMetadata({ state: "regular" });

    return Promise.resolve();
  }

  public async delete(threadId: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");
    if (data.lastState !== "regular" && data.lastState !== "archived")
      throw new Error("Thread is not yet created or already deleted");
    data.runtime.updateMetadata({ state: "deleted" });
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
