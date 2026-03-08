import type { ThreadListRuntimeCore } from "../../runtime/interfaces/thread-list-runtime-core";
import { BaseSubscribable } from "../../subscribable";
import type { LocalThreadRuntimeCore } from "./local-thread-runtime-core";

export type LocalThreadFactory = () => LocalThreadRuntimeCore;

const EMPTY_ARRAY = Object.freeze([]);
const DEFAULT_THREAD_ID = "__DEFAULT_ID__";
const DEFAULT_THREAD_DATA = Object.freeze({
  [DEFAULT_THREAD_ID]: {
    id: DEFAULT_THREAD_ID,
    remoteId: undefined,
    externalId: undefined,
    status: "regular" as const,
    title: undefined,
  },
});
export class LocalThreadListRuntimeCore
  extends BaseSubscribable
  implements ThreadListRuntimeCore
{
  private _mainThread: LocalThreadRuntimeCore;
  constructor(_threadFactory: LocalThreadFactory) {
    super();

    this._mainThread = _threadFactory();
  }

  public get isLoading() {
    return false;
  }

  public getMainThreadRuntimeCore() {
    return this._mainThread;
  }

  public get newThreadId(): string | undefined {
    return undefined;
  }

  public get threadIds(): readonly string[] {
    return EMPTY_ARRAY;
  }

  public get archivedThreadIds(): readonly string[] {
    return EMPTY_ARRAY;
  }

  public get mainThreadId(): string {
    return DEFAULT_THREAD_ID;
  }

  public get threadItems() {
    return DEFAULT_THREAD_DATA;
  }

  public getThreadRuntimeCore(): never {
    throw new Error("Method not implemented.");
  }

  public getLoadThreadsPromise(): Promise<void> {
    return Promise.resolve();
  }

  public getItemById(threadId: string) {
    if (threadId === this.mainThreadId) {
      return {
        status: "regular" as const,
        id: this.mainThreadId,
        remoteId: this.mainThreadId,
        externalId: undefined,
        title: undefined,
        isMain: true,
      };
    }
    throw new Error("Method not implemented");
  }

  public async switchToThread(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public switchToNewThread(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public rename(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public archive(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public detach(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public unarchive(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public delete(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public initialize(
    threadId: string,
  ): Promise<{ remoteId: string; externalId: string | undefined }> {
    return Promise.resolve({ remoteId: threadId, externalId: undefined });
  }

  public generateTitle(): never {
    throw new Error("Method not implemented.");
  }
}
