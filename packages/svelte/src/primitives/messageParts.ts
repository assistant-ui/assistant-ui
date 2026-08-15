import { tick } from "svelte";
import type { PartMethods, PartState } from "@assistant-ui/core/store";
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
 * A per-index handle over one message content part: through it, `useAuiState`
 * resolves `s.part` to the part at the index and the part methods
 * (`addToolResult`, `resumeToolCall`, `respondToToolApproval`) address it,
 * extending the surrounding message scope. The handle's scope mounts when the
 * first reader is observed and suspends once none remain, like `MessageItem`.
 */
export type PartItem = ScopeTarget;

const createPartItem = (context: AuiContext, index: number): PartItem => {
  let observers = 0;
  const cache = createLastValidCache<PartMethods>(
    createStaleReporter({
      name: "messageParts.item",
      index,
      isCurrent: () => observers > 0,
      isValid: () =>
        index < context.source.getClient().message.getState().parts.length,
    }),
    scheduleExpiry,
  );

  const handle = createAssistantClient(
    AuiConfig({
      part: Derived({
        source: "message",
        query: { type: "index", index },
        get: (aui) =>
          cache.resolve(index < aui.message.getState().parts.length, () =>
            aui.message.part({ index }),
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
