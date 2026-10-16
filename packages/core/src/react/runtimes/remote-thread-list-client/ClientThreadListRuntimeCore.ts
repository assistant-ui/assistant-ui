import { useAui } from "@assistant-ui/store";
import type { AssistantClientHandle } from "@assistant-ui/store/client";
import { createElement, useEffect, useId, type FC } from "react";
import { RemoteThreadListHookInstanceManager } from "../RemoteThreadListHookInstanceManager";
import type { RemoteThreadListHook } from "../RemoteThreadResource";
import { useSubscribable } from "../../../store/runtime-clients/useSubscribable";
import type {
  ThreadListItemCoreState,
  ThreadListRuntimeCore,
  ThreadListRuntimeEvent,
} from "../../../runtime/interfaces/thread-list-runtime-core";
import type { ThreadRuntimeCore } from "../../../runtime/interfaces/thread-runtime-core";
import { EMPTY_THREAD_CORE } from "../../../runtimes/remote-thread-list/empty-thread-core";
import { LOCAL_THREAD_ID_PREFIX } from "../../../runtimes/remote-thread-list/remote-thread-state";
import { isTitleSourceMessage } from "../../../runtimes/remote-thread-list/title";
import type { Unsubscribe } from "../../../types/unsubscribe";
import { WritableSubscribable } from "../../../subscribable/subscribable";

const createRuntimeHost = (
  manager: RemoteThreadListHookInstanceManager,
  boundIdsStore: WritableSubscribable<readonly string[]>,
): FC =>
  function RuntimeHost() {
    const id = useId();
    const aui = useAui();
    useEffect(() => {
      boundIdsStore.setState([...boundIdsStore.getState(), id]);
      return () =>
        boundIdsStore.setState(
          boundIdsStore.getState().filter((other) => other !== id),
        );
    }, [id]);
    const boundIds = useSubscribable(boundIdsStore);
    return boundIds.length === 0 || boundIds[0] === id
      ? createElement(manager.__internal_Host, {
          parentClient: aui,
        })
      : null;
  };

export class ClientThreadListRuntimeCore implements ThreadListRuntimeCore {
  private readonly handle: AssistantClientHandle;
  public readonly hookManager: RemoteThreadListHookInstanceManager;
  private readonly boundIdsStore = new WritableSubscribable<readonly string[]>(
    [],
  );
  private get aui() {
    return this.handle.getClient();
  }
  private readonly initialId: string;
  private readonly initialItem: ThreadListItemCoreState;
  private readonly initialItems: readonly ThreadListItemCoreState[];
  private cachedItems: readonly ThreadListItemCoreState[] | undefined;
  private cachedItemMap: Record<string, ThreadListItemCoreState> | undefined;
  private readonly seenItems = new Map<string, ThreadListItemCoreState>();
  private readonly visitedIds = new Set<string>();

  constructor(
    initialThreadIdSeed: string,
    handle: AssistantClientHandle,
    runtimeHook: RemoteThreadListHook,
    startInitialThread = true,
  ) {
    this.handle = handle;
    this.hookManager = new RemoteThreadListHookInstanceManager(
      runtimeHook,
      this,
      true,
    );
    this.initialId = `${LOCAL_THREAD_ID_PREFIX}${initialThreadIdSeed}`;
    this.initialItem = {
      id: this.initialId,
      remoteId: undefined,
      externalId: undefined,
      status: "new",
    };
    this.initialItems = [this.initialItem];
    this.__internal_RenderComponent = createRuntimeHost(
      this.hookManager,
      this.boundIdsStore,
    );
    if (startInitialThread)
      void this.hookManager.startThreadRuntime(this.initialId).catch(() => {});
  }

  public readonly __internal_RenderComponent: FC;

  public __internal_ensureThread = async (item: ThreadListItemCoreState) => {
    this.seenItems.set(item.id, item);
    this.visitedIds.add(item.id);
    await this.hookManager.startThreadRuntime(item.id);
  };

  public __internal_isThreadAttached = (threadId: string) =>
    this.hookManager.getThreadRuntimeCore(threadId) !== undefined;

  public __internal_dispose() {
    this.hookManager.__internal_dispose();
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
  public get switchError() {
    return this.state?.switchError;
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

  public getMainThreadRuntimeCore(): ThreadRuntimeCore {
    return this.getThreadRuntimeCore(this.mainThreadId);
  }

  public getThreadRuntimeCore(threadId: string): ThreadRuntimeCore {
    const id = this.getItemById(threadId)?.id ?? threadId;
    return this.hookManager.getThreadRuntimeCore(id) ?? EMPTY_THREAD_CORE;
  }

  public unstable_isThreadRunning(threadIdOrRemoteId: string) {
    const item = this.getItemById(threadIdOrRemoteId);
    if (!item) return false;
    return this.hookManager.__internal_isThreadRunning(item.id);
  }

  public unstable_subscribeThreadEvents(
    callback: (event: ThreadListRuntimeEvent) => void,
  ): Unsubscribe {
    return this.hookManager.__internal_subscribeThreadEvents(callback);
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
    return this.aui.threads.getLoadThreadsPromise();
  }
  public reload() {
    return this.aui.threads.reload();
  }
  public loadMore() {
    return this.aui.threads.loadMore();
  }
  public async detach(threadId: string) {
    await this.actions.detach(threadId);
    this.visitedIds.delete(threadId);
    this.seenItems.delete(threadId);
  }
  public rename(threadId: string, title: string) {
    return this.actions.rename(threadId, title);
  }
  public async updateCustom(
    threadId: string,
    custom: Record<string, unknown> | undefined,
  ) {
    return this.aui.threads.item({ id: threadId }).updateCustom(custom);
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
    const id = this.getItemById(threadId)?.id ?? threadId;
    const messages = this.hookManager
      .getThreadRuntimeCore(id)
      ?.messages.filter(isTitleSourceMessage);
    return this.actions.generateTitle(threadId, messages, options);
  }

  public async reloadMainThread() {
    const id = this.mainThreadId;
    if (this.getItemById(id)?.status === "new") return;
    const core = this.getMainThreadRuntimeCore();
    if (core.unstable_refetchThread) {
      await core.unstable_refetchThread();
      return;
    }
    await this.hookManager.__internal_restartThreadRuntime(id);
  }

  public subscribe(callback: () => void): Unsubscribe {
    const unsubscribeClient = this.handle.subscribe(callback);
    const unsubscribeManager = this.hookManager.subscribe(callback);
    const unsubscribeRunning =
      this.hookManager.__internal_subscribeRunningChanged(callback);
    return () => {
      unsubscribeClient();
      unsubscribeManager();
      unsubscribeRunning();
    };
  }
}
