import type { Unsubscribe } from "../../types";
import {
  ThreadListMetadata,
  ThreadListRuntimeCore,
} from "../core/ThreadListRuntimeCore";
import { ExportedMessageRepository } from "../utils/MessageRepository";
import { generateId } from "../../utils/idUtils";
import { LocalThreadRuntimeCore } from "./LocalThreadRuntimeCore";

export type LocalThreadData = {
  data: ExportedMessageRepository;
  metadata: ThreadListMetadata;
  isArchived: boolean;
};

export type LocalThreadFactory = (
  threadId: string,
  data: ExportedMessageRepository,
) => LocalThreadRuntimeCore;

export class LocalThreadListRuntimeCore implements ThreadListRuntimeCore {
  private _threadData = new Map<string, LocalThreadData>();

  private _threads: readonly ThreadListMetadata[] = [];
  private _archivedThreads: readonly ThreadListMetadata[] = [];

  public get threads() {
    return this._threads;
  }

  public get archivedThreads() {
    return this._archivedThreads;
  }

  private _mainThread: LocalThreadRuntimeCore;

  public get mainThread(): LocalThreadRuntimeCore {
    return this._mainThread;
  }

  constructor(private _threadFactory: LocalThreadFactory) {
    const threadId = generateId();
    this._threadData.set(threadId, {
      data: { messages: [] },
      metadata: { threadId },
      isArchived: false,
    });
    this._threads = [{ threadId }];
    this._mainThread = this._threadFactory(threadId, { messages: [] });
  }

  public getThreadMetadataById(threadId: string) {
    return this._threadData.get(threadId)?.metadata;
  }

  public async switchToThread(threadId: string): Promise<void> {
    console.log("switchToThread", threadId);
    if (this._mainThread.threadId === threadId) return;

    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    if (data.isArchived) await this._performMoveOp(threadId, "unarchive");

    const newThreadCore = this._threadFactory(threadId, data.data);

    const mainThreadData = this._threadData.get(this._mainThread.threadId);
    if (!mainThreadData) throw new Error("Main thread not found");

    const exprt = this._mainThread.export();
    mainThreadData.data = exprt;

    this._mainThread._notifyEventSubscribers("switched-away");
    this._mainThread = newThreadCore;
    this._notifySubscribers();

    newThreadCore._notifyEventSubscribers("switched-to");
  }

  public async switchToNewThread(): Promise<void> {
    const threadId = generateId();
    this._threadData.set(threadId, {
      data: { messages: [] },
      metadata: { threadId },
      isArchived: false,
    });
    this._threads = [{ threadId }, ...this._threads];
    await this.switchToThread(threadId);
  }

  private async _performMoveOp(
    threadId: string,
    operation: "archive" | "unarchive" | "delete",
  ) {
    console.log("_performMoveOp", threadId, operation);

    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    if (operation === "archive" && data.isArchived) return;
    if (operation === "unarchive" && !data.isArchived) return;

    if (operation === "archive") {
      data.isArchived = true;
      this._archivedThreads = [...this._archivedThreads, data.metadata];
    }
    if (operation === "unarchive") {
      data.isArchived = false;
      this._threads = [...this._threads, data.metadata];
    }
    if (operation === "delete") {
      this._threadData.delete(threadId);
    }

    if (
      operation === "archive" ||
      (operation === "delete" && !data.isArchived)
    ) {
      this._threads = this._threads.filter((t) => t.threadId !== threadId);
    }

    if (
      operation === "unarchive" ||
      (operation === "delete" && data.isArchived)
    ) {
      this._archivedThreads = this._archivedThreads.filter(
        (t) => t.threadId !== threadId,
      );
    }

    if (
      threadId === this._mainThread.threadId &&
      (operation === "archive" || operation === "delete")
    ) {
      const lastThread = this._threads[0]?.threadId;
      console.log("reset", this.threads, threadId, lastThread);
      if (lastThread) {
        await this.switchToThread(lastThread);
      } else {
        await this.switchToNewThread();
      }
      console.log("reset2", this.threads, this._mainThread.threadId);
    }
  }

  public async rename(threadId: string, newTitle: string): Promise<void> {
    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    data.metadata = {
      ...data.metadata,
      title: newTitle,
    };

    const threadList = data.isArchived ? this.archivedThreads : this.threads;
    const idx = threadList.findIndex((t) => t.threadId === threadId);
    const updatedThreadList = threadList.toSpliced(idx, 1, data.metadata);
    if (data.isArchived) {
      this._archivedThreads = updatedThreadList;
    } else {
      this._threads = updatedThreadList;
    }
    this._notifySubscribers();
  }

  public async archive(threadId: string): Promise<void> {
    await this._performMoveOp(threadId, "archive");
    this._notifySubscribers();
  }

  public async unarchive(threadId: string): Promise<void> {
    await this._performMoveOp(threadId, "unarchive");
    this._notifySubscribers();
  }

  public async delete(threadId: string): Promise<void> {
    await this._performMoveOp(threadId, "delete");
    this._notifySubscribers();
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
