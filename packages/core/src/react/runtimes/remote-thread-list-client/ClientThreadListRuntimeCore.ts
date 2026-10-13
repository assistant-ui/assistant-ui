import type { AssistantClient } from "@assistant-ui/store";
import type {
  ThreadListItemCoreState,
  ThreadListRuntimeCore,
  ThreadListRuntimeEvent,
} from "../../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../../runtime/interfaces/thread-runtime-core";
import { ThreadRuntimeImpl } from "../../../runtime/api/thread-runtime";
import { EMPTY_THREAD_CORE } from "../../../runtimes/remote-thread-list/empty-thread-core";
import { LOCAL_THREAD_ID_PREFIX } from "../../../runtimes/remote-thread-list/remote-thread-state";
import { supersedeThreadRuntime } from "../../../runtime/utils/thread-runtime-lifecycle";
import type { Unsubscribe } from "../../../types/unsubscribe";
import { WritableSubscribable } from "../../../subscribable/subscribable";

export class ClientThreadListRuntimeCore implements ThreadListRuntimeCore {
  private aui: AssistantClient | undefined;
  private readonly generationStore: WritableSubscribable<number>;
  private readonly initialId: string;
  private readonly initialItem: ThreadListItemCoreState;
  private readonly initialItems: readonly ThreadListItemCoreState[];
  private cachedItems: readonly ThreadListItemCoreState[] | undefined;
  private cachedItemMap: Record<string, ThreadListItemCoreState> | undefined;
  private readonly seenItems = new Map<string, ThreadListItemCoreState>();
  private readonly visitedIds = new Set<string>();

  constructor(
    initialThreadIdSeed: string,
    generationStore: WritableSubscribable<number>,
  ) {
    this.generationStore = generationStore;
    this.initialId = `${LOCAL_THREAD_ID_PREFIX}${initialThreadIdSeed}`;
    this.initialItem = {
      id: this.initialId,
      remoteId: undefined,
      externalId: undefined,
      status: "new",
    };
    this.initialItems = [this.initialItem];
  }

  public __internal_bindClient(aui: AssistantClient) {
    this.aui = aui;
  }

  private get state() {
    const state = this.aui?.threads.getState();
    for (const item of state?.threadItems ?? [])
      this.seenItems.set(item.id, item);
    if (state) this.visitedIds.add(state.mainThreadId);
    return state;
  }

  private get actions() {
    const actions = this.aui?.threads.__internal_getRawActions?.();
    if (!actions) throw new Error("Remote thread list is not mounted.");
    return actions;
  }

  public get isLoading() {
    return this.state?.isLoading ?? true;
  }
  public get loadError() {
    return this.state?.loadError;
  }
  public get isLoadingMore() {
    return this.state?.isLoadingMore ?? false;
  }
  public get hasMore() {
    return this.state?.hasMore ?? false;
  }
  public get mainThreadId() {
    return this.state?.mainThreadId ?? this.initialId;
  }
  public get newThreadId() {
    return this.state?.newThreadId ?? (this.aui ? undefined : this.initialId);
  }
  public get threadIds() {
    return this.state?.threadIds ?? [];
  }
  public get archivedThreadIds() {
    return this.state?.archivedThreadIds ?? [];
  }
  public get threadItems() {
    const items = this.state?.threadItems ?? this.initialItems;
    if (
      this.cachedItems?.length !== items.length ||
      items.some((item, index) => item !== this.cachedItems?.[index])
    ) {
      this.cachedItems = [...items];
      this.cachedItemMap = Object.fromEntries(
        items.map((item) => [item.id, item]),
      );
    }
    return this.cachedItemMap!;
  }

  private coreOf(
    runtime: ReturnType<AssistantClient["threads"]["thread"]> | undefined,
  ): ThreadRuntimeCore {
    const bound = runtime?.__internal_getRuntime?.();
    return bound instanceof ThreadRuntimeImpl
      ? bound.__internal_threadBinding.getState()
      : EMPTY_THREAD_CORE;
  }

  public getMainThreadRuntimeCore(): ThreadRuntimeCore {
    return this.coreOf(this.aui?.threads.thread("main"));
  }

  public getThreadRuntimeCore(threadId: string): ThreadRuntimeCore {
    return this.coreOf(this.aui?.threads.__internal_getThreadBody?.(threadId));
  }

  public unstable_isThreadRunning(threadId: string) {
    return (
      this.state?.threadItems.find(
        (item) => item.id === threadId || item.remoteId === threadId,
      )?.isRunning ?? false
    );
  }

  public unstable_subscribeThreadEvents(
    callback: (event: ThreadListRuntimeEvent) => void,
  ): Unsubscribe {
    return (
      this.aui?.on({ scope: "*", event: "*" }, ({ event, payload }) => {
        if (
          event === "thread.runStart" ||
          event === "thread.runEnd" ||
          event === "thread.initialize" ||
          event === "thread.modelContextUpdate"
        ) {
          callback({
            type: event.slice(
              "thread.".length,
            ) as ThreadListRuntimeEvent["type"],
            threadId: payload.threadId,
          });
        }
      }) ?? (() => {})
    );
  }

  public getItemById(threadId: string) {
    return (
      this.state?.threadItems.find(
        (item) => item.id === threadId || item.remoteId === threadId,
      ) ??
      (this.visitedIds.has(threadId)
        ? this.seenItems.get(threadId)
        : undefined) ??
      (!this.aui && threadId === this.initialId ? this.initialItem : undefined)
    );
  }

  public async switchToThread(
    threadId: string,
    options?: { unarchive?: boolean },
  ) {
    await this.actions.switchToThread(threadId, options);
    this.visitedIds.add(this.getItemById(threadId)?.id ?? threadId);
  }
  public switchToNewThread() {
    return this.actions.switchToNewThread();
  }
  public getLoadThreadsPromise() {
    return this.actions.getLoadThreadsPromise();
  }
  public reload() {
    return this.actions.reload();
  }
  public loadMore() {
    return this.actions.loadMore();
  }
  public async detach(threadId: string) {
    await this.actions.detach(threadId);
    this.visitedIds.delete(threadId);
    this.seenItems.delete(threadId);
  }
  public rename(threadId: string, title: string) {
    return this.actions.rename(threadId, title);
  }
  public archive(threadId: string) {
    return this.actions.archive(threadId);
  }
  public unarchive(threadId: string) {
    return this.actions.unarchive(threadId);
  }
  public async delete(threadId: string) {
    await this.actions.delete(threadId);
    this.visitedIds.delete(threadId);
    this.seenItems.delete(threadId);
  }
  public initialize(threadId: string) {
    return this.actions.initialize(threadId);
  }
  public generateTitle(threadId: string, options?: { automatic?: boolean }) {
    return this.actions.generateTitle(threadId, undefined, options);
  }

  public async reloadMainThread() {
    const id = this.mainThreadId;
    if (this.getItemById(id)?.status === "new") return;
    const core = this.getMainThreadRuntimeCore();
    if (core.unstable_refetchThread) {
      await core.unstable_refetchThread();
      return;
    }
    supersedeThreadRuntime(core);
    this.generationStore.setState(this.generationStore.getState() + 1);
  }

  public subscribe(callback: () => void): Unsubscribe {
    return this.aui?.subscribe(callback) ?? (() => {});
  }
}
