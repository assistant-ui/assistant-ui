import type { Unsubscribe } from "../../types";
import {
  ThreadManagerMetadata,
  ThreadManagerRuntimeCore,
} from "../core/ThreadManagerRuntimeCore";
import { ExportedMessageRepository } from "../utils/MessageRepository";
import { generateId } from "../../utils/idUtils";
import { LocalThreadRuntimeCore } from "./LocalThreadRuntimeCore";

export type LocalThreadData = {
  data: ExportedMessageRepository;
  metadata: ThreadManagerMetadata;
  isArchived: boolean;
};

export type LocalThreadFactory = (
  threadId: string,
  data: ExportedMessageRepository,
) => LocalThreadRuntimeCore;

export class LocalThreadManagerRuntimeCore implements ThreadManagerRuntimeCore {
  private _threadData = new Map<string, LocalThreadData>();

  private _threads: readonly ThreadManagerMetadata[] = [];
  private _archivedThreads: readonly ThreadManagerMetadata[] = [];

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

  public switchToThread(threadId: string): void {
    if (this._mainThread.threadId === threadId) return;

    const data = this._threadData.get(threadId);
    if (!data) throw new Error("Thread not found");

    const thread = this._threadFactory(threadId, data.data);
    this._performThreadSwitch(thread);
  }

  public switchToNewThread(): void {
    const threadId = generateId();
    this._threadData.set(threadId, {
      data: { messages: [] },
      metadata: { threadId },
      isArchived: false,
    });
    this._threads = [{ threadId }];
    const thread = this._threadFactory(threadId, { messages: [] });
    this._performThreadSwitch(thread);
  }

  private _performThreadSwitch(newThreadCore: LocalThreadRuntimeCore) {
    const data = this._threadData.get(this._mainThread.threadId);
    if (!data) throw new Error("Thread not found");

    const exprt = this._mainThread.export();
    data.data = exprt;

    this._mainThread._notifyEventSubscribers("switched-away");
    this._mainThread = newThreadCore;
    newThreadCore._notifyEventSubscribers("switched-to");

    this._notifySubscribers();
  }

  private _performMoveOp(
    threadId: string,
    operation: "archive" | "unarchive" | "delete",
  ) {
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
      (operation === "delete" && data.isArchived)
    ) {
      this._archivedThreads = this._archivedThreads.filter(
        (t) => t.threadId !== threadId,
      );
    }

    if (
      operation === "unarchive" ||
      (operation === "delete" && !data.isArchived)
    ) {
      this._threads = this._threads.filter((t) => t.threadId !== threadId);
    }

    this._notifySubscribers();
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
    this._performMoveOp(threadId, "archive");
  }

  public async unarchive(threadId: string): Promise<void> {
    this._performMoveOp(threadId, "unarchive");
  }

  public async delete(threadId: string): Promise<void> {
    this._performMoveOp(threadId, "delete");
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
