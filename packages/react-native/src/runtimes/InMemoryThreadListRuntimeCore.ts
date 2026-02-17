import type {
  ThreadListRuntimeCore,
  ThreadListItemCoreState,
} from "@assistant-ui/core";
import { BaseSubscribable } from "@assistant-ui/core/internal";
import type {
  LocalThreadRuntimeCore,
  LocalThreadFactory,
} from "@assistant-ui/core/internal";
import type { TitleGenerationAdapter } from "../adapters/TitleGenerationAdapter";

let nextId = 0;
const generateId = () => `thread_${++nextId}`;
const EMPTY_ARRAY: readonly string[] = Object.freeze([]);

export type InMemoryThreadListOptions = {
  titleGenerator?: TitleGenerationAdapter | undefined;
};

export class InMemoryThreadListRuntimeCore
  extends BaseSubscribable
  implements ThreadListRuntimeCore
{
  private _threads = new Map<string, LocalThreadRuntimeCore>();
  private _threadItems: Record<string, ThreadListItemCoreState> = {};
  private _threadIds: string[] = [];
  private _mainThreadId: string;
  private _titleGenerator: TitleGenerationAdapter | undefined;
  private _threadUnsubscribes = new Map<string, () => void>();

  constructor(
    private _threadFactory: LocalThreadFactory,
    options?: InMemoryThreadListOptions,
  ) {
    super();

    this._titleGenerator = options?.titleGenerator;

    const id = generateId();
    const core = _threadFactory();
    this._threads.set(id, core);
    this._threadItems[id] = {
      id,
      remoteId: id,
      externalId: undefined,
      status: "regular",
      title: undefined,
    };
    this._threadIds = [id];
    this._mainThreadId = id;

    this._subscribeToRunEnd(id, core);
  }

  private _subscribeToRunEnd(id: string, core: LocalThreadRuntimeCore) {
    const unsubscribe = core.unstable_on("runEnd", () => {
      const item = this._threadItems[id];
      if (item && !item.title) {
        void this.generateTitle(id);
      }
    });
    this._threadUnsubscribes.set(id, unsubscribe);
  }

  public get isLoading() {
    return false;
  }

  public get mainThreadId() {
    return this._mainThreadId;
  }

  public get newThreadId(): string | undefined {
    return undefined;
  }

  public get threadIds(): readonly string[] {
    return this._threadIds;
  }

  public get archivedThreadIds(): readonly string[] {
    return EMPTY_ARRAY;
  }

  public get threadItems(): Readonly<Record<string, ThreadListItemCoreState>> {
    return this._threadItems;
  }

  public getMainThreadRuntimeCore(): LocalThreadRuntimeCore {
    return this._threads.get(this._mainThreadId)!;
  }

  public getThreadRuntimeCore(threadId: string): LocalThreadRuntimeCore {
    const core = this._threads.get(threadId);
    if (!core) throw new Error(`Thread ${threadId} not found`);
    return core;
  }

  public getItemById(threadId: string): ThreadListItemCoreState | undefined {
    return this._threadItems[threadId];
  }

  public getLoadThreadsPromise(): Promise<void> {
    return Promise.resolve();
  }

  public async switchToNewThread(): Promise<void> {
    const id = generateId();
    const core = this._threadFactory();
    this._threads.set(id, core);
    this._threadItems = {
      ...this._threadItems,
      [id]: {
        id,
        remoteId: id,
        externalId: undefined,
        status: "regular",
        title: undefined,
      },
    };
    this._threadIds = [id, ...this._threadIds];
    this._mainThreadId = id;

    this._subscribeToRunEnd(id, core);

    this._notifySubscribers();
  }

  public async switchToThread(threadId: string): Promise<void> {
    if (!this._threads.has(threadId)) {
      throw new Error(`Thread ${threadId} not found`);
    }
    this._mainThreadId = threadId;
    this._notifySubscribers();
  }

  public async rename(threadId: string, newTitle: string): Promise<void> {
    const item = this._threadItems[threadId];
    if (!item) throw new Error(`Thread ${threadId} not found`);
    this._threadItems = {
      ...this._threadItems,
      [threadId]: { ...item, title: newTitle },
    };
    this._notifySubscribers();
  }

  public async delete(threadId: string): Promise<void> {
    this._threadUnsubscribes.get(threadId)?.();
    this._threadUnsubscribes.delete(threadId);
    this._threads.delete(threadId);
    const { [threadId]: _, ...rest } = this._threadItems;
    this._threadItems = rest;
    this._threadIds = this._threadIds.filter((id) => id !== threadId);

    if (this._mainThreadId === threadId) {
      if (this._threadIds.length === 0) {
        await this.switchToNewThread();
        return;
      }
      this._mainThreadId = this._threadIds[0]!;
    }

    this._notifySubscribers();
  }

  public async generateTitle(threadId: string): Promise<void> {
    const core = this._threads.get(threadId);
    if (!core) return;

    const messages = core.messages;

    if (this._titleGenerator) {
      const title = await this._titleGenerator.generateTitle(messages);
      await this.rename(threadId, title);
      return;
    }

    const firstUserMsg = messages.find((m) => m.role === "user");
    if (!firstUserMsg) return;

    const textPart = firstUserMsg.content.find((p) => p.type === "text");
    if (!textPart || textPart.type !== "text") return;

    const title = textPart.text.slice(0, 50);
    await this.rename(threadId, title);
  }

  public async archive(): Promise<void> {
    // no-op
  }

  public async unarchive(): Promise<void> {
    // no-op
  }

  public async detach(): Promise<void> {
    // no-op
  }

  public initialize(
    threadId: string,
  ): Promise<{ remoteId: string; externalId: string | undefined }> {
    return Promise.resolve({ remoteId: threadId, externalId: undefined });
  }
}
