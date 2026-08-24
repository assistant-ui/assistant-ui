import type { PartMethods, PartState } from "@assistant-ui/core/store";
import {
  createLastValidCache,
  createStaleReporter,
  Derived,
} from "@assistant-ui/store/client";
import { getAuiContext, type AuiContext, type ScopeTarget } from "../context";
import { useAuiState } from "../useAuiState";
import { createObservedItem, scheduleExpiry } from "./observedItem";

/**
 * A per-index handle over one message content part: through it, `useAuiState`
 * resolves `s.part` to the part at the index and the part methods
 * (`addToolResult`, `resumeToolCall`, `respondToToolApproval`) address it,
 * extending the surrounding message scope. The handle's scope mounts when the
 * first reader is observed and suspends once none remain, like `MessageItem`.
 */
export type PartItem = ScopeTarget;

const createPartItem = (context: AuiContext, index: number): PartItem =>
  createObservedItem(context, (isObserved) => {
    const cache = createLastValidCache<PartMethods>(
      createStaleReporter({
        name: "messageParts.item",
        index,
        isCurrent: isObserved,
        isValid: () =>
          index < context.source.getClient().message.getState().parts.length,
      }),
      scheduleExpiry,
    );
    return {
      part: Derived({
        source: "message",
        query: { type: "index", index },
        get: (aui) =>
          cache.resolve(index < aui.message.getState().parts.length, () =>
            aui.message.part({ index }),
          ),
      }),
    };
  });

/**
 * Builder for a message's content parts. Call during component
 * initialization inside a message scope (pass the row's `item`); iterate
 * `items` by index and scope per-part work through `item(index)`. The item
 * states carry the per-part status the raw `message.content` lacks. Items
 * are cached per index for the builder's lifetime, suspending and resuming
 * with observation like `threadMessages`. Iterate unkeyed: `item(index)` is
 * bound to its position.
 */
export const messageParts = (options?: { item?: ScopeTarget | undefined }) => {
  const context = options?.item ?? getAuiContext();
  const items = useAuiState((s) => s.message.parts, { item: context });
  const cache = new Map<number, PartItem>();

  return {
    get items(): readonly PartState[] {
      return items.current;
    },
    item: (index: number): PartItem => {
      let item = cache.get(index);
      if (!item) {
        item = createPartItem(context, index);
        cache.set(index, item);
      }
      return item;
    },
  };
};
