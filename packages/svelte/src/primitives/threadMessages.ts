import { tick } from "svelte";
import type { ThreadMessage } from "@assistant-ui/core";
import type { ComposerMethods, MessageMethods } from "@assistant-ui/core/store";
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
 * A per-index handle over one thread message: through it, `useAuiState` and
 * the builders resolve `s.message` to the message at the index and
 * `s.composer` to its edit composer, extending the surrounding provider. The
 * handle's scopes mount when the first reader is observed and suspend once
 * none remain, so a row should read state before invoking actions.
 */
export type MessageItem = ScopeTarget;

const createMessageItem = (context: AuiContext, index: number): MessageItem => {
  const messageCache = createLastValidCache<MessageMethods>(
    createStaleReporter({
      name: "threadMessages.item",
      index,
      isCurrent: () => true,
      isValid: () =>
        index < context.source.getClient().thread.getState().messages.length,
    }),
    scheduleExpiry,
  );
  const composerCache = createLastValidCache<ComposerMethods>(
    null,
    scheduleExpiry,
  );

  const handle = createAssistantClient(
    AuiConfig({
      message: Derived({
        source: "thread",
        query: { type: "index", index },
        get: (aui) =>
          messageCache.resolve(
            index < aui.thread.getState().messages.length,
            () => aui.thread.message({ index }),
          ),
      }),
      composer: Derived({
        source: "message",
        query: {},
        get: (aui) =>
          composerCache.resolve(
            index < aui.thread.getState().messages.length,
            () => aui.thread.message({ index }).composer(),
          ),
      }),
    }),
    { parent: context.source },
  );

  const source = {
    getClient: handle.getClient,
    subscribe: handle.subscribe,
  };
  return {
    source,
    aui: createClientFacade(source),
  };
};

/**
 * Builder for the thread's message list. Call during component
 * initialization; iterate `items` keyed by message id and scope per-row work
 * through `item(index)`.
 *
 * Items are cached per index for the builder's lifetime: a row that stops
 * being observed suspends its scopes and resumes with state intact when a
 * later render reads it again.
 *
 * @example
 * ```svelte
 * const messages = threadMessages();
 * // {#each messages.items as message, index (message.id)}
 * //   {@const item = messages.item(index)}
 * // {/each}
 * ```
 */
export const threadMessages = () => {
  const context = getAuiContext();
  const items = useAuiState(
    (s) => s.thread.messages as readonly ThreadMessage[],
    { item: context },
  );
  const cache = new Map<number, MessageItem>();

  return {
    get items(): readonly ThreadMessage[] {
      return items.current;
    },
    item: (index: number): MessageItem => {
      let item = cache.get(index);
      if (!item) {
        item = createMessageItem(context, index);
        cache.set(index, item);
      }
      return item;
    },
  };
};
