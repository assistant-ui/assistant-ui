import { tick } from "svelte";
import type {
  ThreadListItemMethods,
  ThreadsState,
} from "@assistant-ui/core/store";
import {
  AuiConfig,
  createAssistantClient,
  createClientFacade,
  createLastValidCache,
  createStaleReporter,
  Derived,
} from "@assistant-ui/store/client";
import { getAuiContext, type AuiContext, type ScopeTarget } from "../context";
import { useAuiState } from "../useAuiState";

const scheduleExpiry = (callback: () => void) => void tick().then(callback);

/**
 * A per-index handle over one thread-list item: through it, `useAuiState` and
 * the builders resolve `s.threadListItem` to the thread at the index,
 * extending the surrounding provider. The handle's scope mounts when the
 * first reader is observed and suspends once none remain, like
 * `MessageItem`.
 */
export type ThreadListItem = ScopeTarget;

const createThreadListItem = (
  context: AuiContext,
  index: number,
  archived: boolean,
): ThreadListItem => {
  const idsOf = (state: ThreadsState) =>
    archived ? state.archivedThreadIds : state.threadIds;
  let observers = 0;
  const cache = createLastValidCache<ThreadListItemMethods>(
    createStaleReporter({
      name: "threadList.item",
      index,
      isCurrent: () => observers > 0,
      isValid: () =>
        index < idsOf(context.source.getClient().threads.getState()).length,
    }),
    scheduleExpiry,
  );

  const handle = createAssistantClient(
    AuiConfig({
      threadListItem: Derived({
        source: "threads",
        query: { type: "index", index, archived },
        get: (aui) =>
          cache.resolve(index < idsOf(aui.threads.getState()).length, () =>
            aui.threads.item({ index, archived }),
          ),
      }),
    }),
    { parent: context.source },
  );

  const source = {
    getClient: handle.getClient,
    subscribe: (listener: () => void) => {
      const release = handle.subscribe(listener);
      observers++;
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        observers--;
        release();
      };
    },
  };
  return {
    source,
    aui: createClientFacade(source),
  };
};

/**
 * Builder for the thread list. Call during component initialization; iterate
 * `ids` by index and scope per-row work through `item(index)`. With
 * `archived`, both cover the archived list instead. Items are cached per
 * index for the builder's lifetime, suspending and resuming with observation
 * like `threadMessages`. Iterate unkeyed: keying the `{#each}` by thread id
 * would let a row whose index shifts keep its component instance silently
 * driving the old index, with no stale report while the index stays in
 * range.
 */
export const threadList = (options?: { archived?: boolean | undefined }) => {
  const archived = options?.archived ?? false;
  const context = getAuiContext();
  const ids = useAuiState(
    (s) => (archived ? s.threads.archivedThreadIds : s.threads.threadIds),
    { item: context },
  );
  const cache = new Map<number, ThreadListItem>();

  return {
    get ids(): readonly string[] {
      return ids.current;
    },
    item: (index: number): ThreadListItem => {
      let item = cache.get(index);
      if (!item) {
        item = createThreadListItem(context, index, archived);
        cache.set(index, item);
      }
      return item;
    },
  };
};

/**
 * Builder for the new-thread button. Spread `props` onto a `<button>`.
 * Switches to a new thread; carries `data-active` and `aria-current` while
 * the new thread is the main one. Caller handlers compose the same way as
 * `composerSend`. Call during component initialization.
 */
export const threadListNew = () => {
  const { aui } = getAuiContext();
  const active = useAuiState(
    (s) => s.threads.newThreadId === s.threads.mainThreadId,
  );

  return {
    props: {
      type: "button" as const,
      get "data-active"() {
        return active.current ? "true" : undefined;
      },
      get "aria-current"() {
        return active.current ? ("true" as const) : undefined;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented) return;
        aui.threads.switchToNewThread();
      },
    },
  };
};

/**
 * Builder for a thread-list row button. Spread `props` onto a `<button>`.
 * Switches to the scoped item's thread; carries `data-active` and
 * `aria-current` while that thread is the main one. Caller handlers compose
 * the same way as `composerSend`. Without `item`, call during component
 * initialization.
 */
export const threadListItemTrigger = (options?: {
  item?: ScopeTarget | undefined;
}) => {
  const item = options?.item ?? getAuiContext();
  const { aui } = item;
  const active = useAuiState(
    (s) => s.threads.mainThreadId === s.threadListItem.id,
    { item },
  );

  return {
    props: {
      type: "button" as const,
      get "data-active"() {
        return active.current ? "true" : undefined;
      },
      get "aria-current"() {
        return active.current ? ("true" as const) : undefined;
      },
      onclick: (event?: MouseEvent) => {
        if (event?.defaultPrevented) return;
        aui.threadListItem.switchTo();
      },
    },
  };
};
