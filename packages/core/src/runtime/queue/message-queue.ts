import type {
  AppendMessage,
  FileMessagePart,
  TextMessagePart,
} from "../../types/message";
import {
  EMPTY_QUEUE_ITEMS,
  type QueueItemState,
} from "../../store/scopes/queue-item";
import { generateId } from "../../utils/id";
import { getThreadMessageText } from "../../utils/text";
import type {
  ExternalThreadQueueAdapter,
  QueuePlacement,
} from "./external-thread-queue-adapter";

export type MessageQueueDriver = {
  run: (message: AppendMessage, options: { steer: boolean }) => void;
  /** When omitted, steering degrades to "process next" instead of interrupting. */
  cancel?: (() => void) | undefined;
};

export type MessageQueueController = {
  readonly adapter: ExternalThreadQueueAdapter;
  /** Mark a run as in flight so concurrent sends buffer; call on the rising edge. */
  notifyBusy: () => void;
  /** Advances to the next pending message; call on the run's falling edge. */
  notifyIdle: () => void;
  /**
   * Pauses queue advance for a user-initiated cancel, so the cancelled run's
   * settle keeps the pending items instead of dispatching the next one; the
   * next explicit send or run start re-arms draining. Call before aborting
   * the run.
   */
  notifyCancelled: () => void;
  /** Empties both lanes without dispatching. */
  clear: () => void;
  subscribe: (callback: () => void) => () => void;
};

type Lane = "queue" | "steer";

const getQueueItemParts = (
  message: AppendMessage,
): readonly (FileMessagePart | TextMessagePart)[] => {
  // attachment-derived text is the file body, not user-authored prose;
  // project only the file/image content of attachments
  const source = [
    ...message.content,
    ...(message.attachments ?? []).flatMap((attachment) =>
      (attachment.content ?? []).filter((part) => part.type !== "text"),
    ),
  ];
  const parts: (FileMessagePart | TextMessagePart)[] = [];
  for (const part of source) {
    if (part.type === "file" || part.type === "text") {
      parts.push(part);
    } else if (part.type === "image") {
      parts.push({
        type: "file",
        data: part.image,
        mimeType: "image/*",
        ...(part.filename !== undefined && { filename: part.filename }),
      });
    }
  }
  return parts;
};

export const createMessageQueue = (
  driver: MessageQueueDriver,
): MessageQueueController => {
  let lanes: Record<Lane, readonly QueueItemState[]> = {
    queue: EMPTY_QUEUE_ITEMS,
    steer: EMPTY_QUEUE_ITEMS,
  };
  const messages = new Map<string, AppendMessage>();
  const subscribers = new Set<() => void>();

  let running = false;
  let paused = false;
  // swallow the cancelled run's settle when steering so it does not double-advance
  let suppressIdle = 0;
  // settles from cancelled runs that must drop `running` without advancing
  let cancelSettles = 0;

  const notify = () => {
    for (const callback of subscribers) callback();
  };

  const setLanes = (next: Record<Lane, readonly QueueItemState[]>) => {
    lanes = next;
    adapter.items = next.queue;
    adapter.steerItems = next.steer;
    notify();
  };

  const toItem = (id: string, message: AppendMessage): QueueItemState => ({
    id,
    prompt: getThreadMessageText(message),
    parts: getQueueItemParts(message),
  });

  const laneOf = (queueItemId: string): Lane | undefined => {
    if (lanes.steer.some((item) => item.id === queueItemId)) return "steer";
    if (lanes.queue.some((item) => item.id === queueItemId)) return "queue";
    return undefined;
  };

  const advance = () => {
    if (running || paused) return;
    const lane: Lane = lanes.steer.length > 0 ? "steer" : "queue";
    const head = lanes[lane][0];
    if (!head) return;
    const message = messages.get(head.id);
    messages.delete(head.id);
    setLanes({ ...lanes, [lane]: lanes[lane].slice(1) });
    if (!message) return;
    running = true;
    driver.run(message, { steer: false });
  };

  const interrupt = (message: AppendMessage) => {
    paused = false;
    // the interrupted run settles exactly once, whether or not it was
    // already cancel-notified
    suppressIdle += Math.max(cancelSettles, 1);
    cancelSettles = 0;
    driver.cancel!();
    running = true;
    driver.run(message, { steer: true });
  };

  const push = (lane: Lane, message: AppendMessage) => {
    paused = false;
    const id = generateId();
    messages.set(id, message);
    setLanes({ ...lanes, [lane]: [...lanes[lane], toItem(id, message)] });
    advance();
  };

  const enqueue = (message: AppendMessage) => {
    push("queue", message);
  };

  const steer = (message: AppendMessage) => {
    if (running && driver.cancel) {
      interrupt(message);
      return;
    }
    push("steer", message);
  };

  const move = (queueItemId: string, placement: QueuePlacement) => {
    const fromLane = laneOf(queueItemId);
    if (!fromLane) throw new Error(`Unknown queue item "${queueItemId}".`);
    const toLane = placement.lane ?? fromLane;

    const item = lanes[fromLane].find((i) => i.id === queueItemId)!;
    const dest = (toLane === fromLane ? lanes[fromLane] : lanes[toLane]).filter(
      (i) => i.id !== queueItemId,
    );

    const anchorIndex = (anchor: string) => {
      if (anchor === queueItemId)
        throw new Error(`Queue item "${queueItemId}" cannot anchor itself.`);
      const index = dest.findIndex((i) => i.id === anchor);
      if (index === -1)
        throw new Error(`Unknown anchor "${anchor}" in lane "${toLane}".`);
      return index;
    };

    const { insertAfter, insertBefore } = placement;
    let index: number;
    if (insertAfter === undefined && insertBefore === undefined) {
      index =
        toLane === fromLane
          ? lanes[fromLane].findIndex((i) => i.id === queueItemId)
          : dest.length;
    } else if (insertAfter !== undefined && insertBefore !== undefined) {
      const after = insertAfter === null ? -1 : anchorIndex(insertAfter);
      const before =
        insertBefore === null ? dest.length : anchorIndex(insertBefore);
      if (before !== after + 1)
        throw new Error(
          `insertAfter "${insertAfter}" and insertBefore "${insertBefore}" are not adjacent in lane "${toLane}".`,
        );
      index = after + 1;
    } else if (insertAfter !== undefined) {
      index = insertAfter === null ? 0 : anchorIndex(insertAfter) + 1;
    } else {
      index = insertBefore === null ? dest.length : anchorIndex(insertBefore!);
    }

    // placement and immediate dispatch cannot coexist: an anchored move into
    // the steer lane places without interrupting; only an unanchored one
    // cancels the live run and dispatches
    if (
      insertAfter === undefined &&
      insertBefore === undefined &&
      toLane === "steer" &&
      fromLane !== "steer" &&
      running &&
      driver.cancel
    ) {
      const message = messages.get(queueItemId)!;
      messages.delete(queueItemId);
      setLanes({
        queue: lanes.queue.filter((i) => i.id !== queueItemId),
        steer: lanes.steer,
      });
      interrupt(message);
      return;
    }

    const nextDest = [...dest.slice(0, index), item, ...dest.slice(index)];
    const next = { ...lanes, [toLane]: nextDest };
    if (toLane !== fromLane)
      next[fromLane] = lanes[fromLane].filter((i) => i.id !== queueItemId);
    setLanes(next);
    advance();
  };

  const edit = (queueItemId: string, message: AppendMessage) => {
    const lane = laneOf(queueItemId);
    if (!lane) throw new Error(`Unknown queue item "${queueItemId}".`);
    messages.set(queueItemId, message);
    setLanes({
      ...lanes,
      [lane]: lanes[lane].map((item) =>
        item.id === queueItemId ? toItem(queueItemId, message) : item,
      ),
    });
  };

  const remove = (queueItemId: string) => {
    if (!messages.delete(queueItemId)) return;
    setLanes({
      queue: lanes.queue.filter((item) => item.id !== queueItemId),
      steer: lanes.steer.filter((item) => item.id !== queueItemId),
    });
  };

  const adapter: ExternalThreadQueueAdapter = {
    items: lanes.queue,
    steerItems: lanes.steer,
    enqueue,
    steer,
    move,
    edit,
    remove,
  };

  return {
    adapter,
    notifyBusy: () => {
      paused = false;
      // a cancelled run's settle that is still outstanding belongs to a run
      // this new one replaces; swallow it entirely
      suppressIdle += cancelSettles;
      cancelSettles = 0;
      running = true;
    },
    notifyIdle: () => {
      if (suppressIdle > 0) {
        suppressIdle--;
        return;
      }
      if (cancelSettles > 0) cancelSettles--;
      running = false;
      advance();
    },
    notifyCancelled: () => {
      if (running && cancelSettles === 0) {
        paused = true;
        cancelSettles = 1;
      }
    },
    clear: () => {
      messages.clear();
      setLanes({ queue: EMPTY_QUEUE_ITEMS, steer: EMPTY_QUEUE_ITEMS });
    },
    subscribe: (callback) => {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
  };
};
