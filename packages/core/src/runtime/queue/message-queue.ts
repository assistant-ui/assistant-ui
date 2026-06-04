import type { AppendMessage } from "../../types/message";
import type { QueueItemState } from "../../store/scopes/queue-item";
import { generateId } from "../../utils/id";
import { getThreadMessageText } from "../../utils/text";
import type { ExternalThreadQueueAdapter } from "./external-thread-queue-adapter";

export type MessageQueueDriver = {
  run: (message: AppendMessage, options: { steer: boolean }) => void;
  /**
   * When omitted, `steer` degrades to "process next": the message moves to the
   * front of the queue and runs once the current run settles, rather than
   * interrupting it.
   */
  cancel?: (() => void) | undefined;
};

export type MessageQueueOptions = {
  deriveId?: ((message: AppendMessage) => string) | undefined;
  derivePrompt?: ((message: AppendMessage) => string) | undefined;
};

export type MessageQueueController = {
  readonly adapter: ExternalThreadQueueAdapter;
  /** Mark a run as in flight so concurrent sends buffer; call on the rising edge. */
  notifyBusy: () => void;
  /** Advances to the next pending message; call on the run's falling edge. */
  notifyIdle: () => void;
  subscribe: (callback: () => void) => () => void;
};

const EMPTY_ITEMS: readonly QueueItemState[] = Object.freeze([]);

export const createMessageQueue = (
  driver: MessageQueueDriver,
  options?: MessageQueueOptions,
): MessageQueueController => {
  let items: readonly QueueItemState[] = EMPTY_ITEMS;
  const messages = new Map<string, AppendMessage>();
  const subscribers = new Set<() => void>();

  let running = false;
  // Number of upcoming idle notifications to swallow: when an in-flight run is
  // cancelled to steer, its settle should not advance the queue (the steered
  // run is already underway).
  let suppressIdle = 0;

  const notify = () => {
    for (const callback of subscribers) callback();
  };

  const setItems = (next: readonly QueueItemState[]) => {
    items = next;
    adapter.items = next;
    notify();
  };

  const advance = () => {
    if (running || items.length === 0) return;
    const head = items[0]!;
    const message = messages.get(head.id);
    messages.delete(head.id);
    setItems(items.slice(1));
    if (!message) return;
    running = true;
    driver.run(message, { steer: false });
  };

  const enqueue = (message: AppendMessage, { steer }: { steer: boolean }) => {
    const id = options?.deriveId?.(message) ?? generateId();
    const prompt =
      options?.derivePrompt?.(message) ?? getThreadMessageText(message);
    messages.set(id, message);
    setItems([...items, { id, prompt }]);
    if (steer) {
      steerItem(id);
    } else {
      advance();
    }
  };

  const steerItem = (queueItemId: string) => {
    if (!messages.has(queueItemId)) return;

    if (driver.cancel && running) {
      const message = messages.get(queueItemId)!;
      messages.delete(queueItemId);
      setItems(items.filter((item) => item.id !== queueItemId));
      suppressIdle++;
      driver.cancel();
      running = true;
      driver.run(message, { steer: true });
      return;
    }

    const target = items.find((item) => item.id === queueItemId);
    if (!target) return;
    setItems([target, ...items.filter((item) => item.id !== queueItemId)]);
    advance();
  };

  const remove = (queueItemId: string) => {
    if (!messages.delete(queueItemId)) return;
    setItems(items.filter((item) => item.id !== queueItemId));
  };

  const clear = () => {
    if (items.length === 0) return;
    messages.clear();
    setItems(EMPTY_ITEMS);
  };

  const adapter: ExternalThreadQueueAdapter = {
    items,
    enqueue,
    steer: steerItem,
    remove,
    clear,
  };

  return {
    adapter,
    notifyBusy: () => {
      running = true;
    },
    notifyIdle: () => {
      if (suppressIdle > 0) {
        suppressIdle--;
        return;
      }
      running = false;
      advance();
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
};
