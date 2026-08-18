import type {
  ComposerMethods,
  MessageMethods,
  MessageState,
} from "@assistant-ui/core/store";
import {
  createLastValidCache,
  createStaleReporter,
  Derived,
} from "@assistant-ui/store/client";
import { getAuiContext, type AuiContext, type ScopeTarget } from "../context";
import { useAuiState } from "../useAuiState";
import { createObservedItem, scheduleExpiry } from "./observedItem";

/**
 * A per-index handle over one thread message: through it, `useAuiState` and
 * the builders resolve `s.message` to the message at the index and
 * `s.composer` to its edit composer, extending the surrounding provider. The
 * handle's scopes mount when the first reader is observed and suspend once
 * none remain. While unobserved the item's client is frozen at its last
 * render: reads return stale state and actions can throw before the first
 * observer, so a row must read state before invoking actions.
 */
export type MessageItem = ScopeTarget;

// The item is cached beyond any row's life, so the stale reporter binds to
// live observation: an ordinary shrink whose rows tear down in the same flush
// settles with no observers and stays quiet, while a row still reading an out
// of bounds index reports, matching the vue provider whose isCurrent dies
// with the row. Known limit: an out-transitioned row is paused, not
// destroyed, so its observer outlives the expiry and a shrink may report;
// revisited with the transitions-aware list chunk.
const createMessageItem = (context: AuiContext, index: number): MessageItem =>
  createObservedItem(context, (isObserved) => {
    const messageCache = createLastValidCache<MessageMethods>(
      createStaleReporter({
        name: "threadMessages.item",
        index,
        isCurrent: isObserved,
        isValid: () =>
          index < context.source.getClient().thread.getState().messages.length,
      }),
      scheduleExpiry,
    );
    const composerCache = createLastValidCache<ComposerMethods>(
      null,
      scheduleExpiry,
    );
    return {
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
    };
  });

/**
 * Builder for the thread's message list. Call during component
 * initialization; iterate `items` by index and scope per-row work through
 * `item(index)`. Until items can be addressed by message id, keying the
 * iteration by id would let a row whose index shifts keep its component
 * instance silently driving the old index, so index iteration trades
 * per-row transition identity for correctness.
 *
 * Items are cached per index for the builder's lifetime: a row that stops
 * being observed suspends its scopes and resumes with state intact when a
 * later render reads it again.
 *
 * @example
 * ```svelte
 * const messages = threadMessages();
 * // {#each messages.items as message, index}
 * //   {@const item = messages.item(index)}
 * // {/each}
 * ```
 */
export const threadMessages = () => {
  const context = getAuiContext();
  const items = useAuiState((s) => s.thread.messages, { item: context });
  const cache = new Map<number, MessageItem>();

  return {
    get items(): readonly MessageState[] {
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
