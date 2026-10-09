import type {
  AppendMessage,
  FileMessagePart,
  TextMessagePart,
} from "../../types/message";
import { EMPTY_QUEUE_ITEMS, type QueueItemState } from "./queue-item";
import { generateId } from "../../utils/id";
import { notifyEventListeners } from "../../utils/notify-event-listeners";
import { getThreadMessageText } from "../../utils/text";
import type {
  ExternalThreadQueueAdapter,
  QueuePlacement,
} from "./external-thread-queue-adapter";

export type MessageQueueDriver = {
  /**
   * A throw or rejected promise before `notifyBusy` restores the message and
   * pauses draining until the next send. Call `notifyBusy` synchronously before
   * committing the message or starting work that can fail; a later render's
   * effect is insufficient. Promise fulfillment does not signal idle.
   */
  run: (message: AppendMessage, options: { steer: boolean }) => void;
  /** When omitted, steering degrades to "process next" instead of interrupting. */
  cancel?: (() => void) | undefined;
};

export type MessageQueueController = {
  readonly adapter: ExternalThreadQueueAdapter;
  hold: () => void;
  release: () => void;
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

type DispatchItem = {
  id: string;
  item: QueueItemState;
  message: AppendMessage;
};

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
  let dispatchPending = false;
  let paused = false;
  let held = false;
  let dispatchTransform: (message: AppendMessage) => AppendMessage = (m) => m;
  type DispatchToken = { started: boolean };
  let suppressIdle: (DispatchToken | undefined)[] = [];
  let cancelSettles: (DispatchToken | undefined)[] = [];
  let interrupting = false;
  let busyEdges = 0;
  let generation = 0;
  let activeDispatch: DispatchToken | undefined;

  const retireFailure = (dispatch: DispatchToken): boolean => {
    if (!dispatch.started) {
      suppressIdle = suppressIdle.filter((pending) => pending !== dispatch);
      const cancelled = cancelSettles.includes(dispatch);
      cancelSettles = cancelSettles.filter((pending) => pending !== dispatch);
      if (cancelled && dispatch !== activeDispatch) {
        if (cancelSettles.length === 0 && suppressIdle.length > 0)
          cancelSettles.push(suppressIdle.pop());
        running = cancelSettles.length > 0;
        advance();
      }
    }
    return dispatch === activeDispatch;
  };

  const observeRun = (pending: unknown, restoreFailure: () => void) => {
    if (pending === undefined) return;
    void Promise.resolve(pending).catch((error: unknown) => {
      restoreFailure();
      console.error("[MessageQueue] run rejected", error);
    });
  };

  const notify = () => {
    notifyEventListeners(subscribers, undefined, "Message queue");
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

  const restore = (lane: Lane, dispatch: DispatchItem, index = 0) => {
    paused = true;
    messages.set(dispatch.id, dispatch.message);
    setLanes({
      ...lanes,
      [lane]: [
        ...lanes[lane].slice(0, index),
        dispatch.item,
        ...lanes[lane].slice(index),
      ],
    });
  };

  const laneOf = (queueItemId: string): Lane | undefined => {
    if (lanes.steer.some((item) => item.id === queueItemId)) return "steer";
    if (lanes.queue.some((item) => item.id === queueItemId)) return "queue";
    return undefined;
  };

  const advance = () => {
    if (running || paused || held) return;
    const lane: Lane = lanes.steer.length > 0 ? "steer" : "queue";
    const head = lanes[lane][0];
    if (!head) return;
    const message = messages.get(head.id);
    if (!message) return;
    running = true;
    messages.delete(head.id);
    const dispatch = { id: head.id, item: head, message };
    const dispatchId = { started: false };
    activeDispatch = dispatchId;
    const busyEdgesBeforeRun = busyEdges;
    const dispatchGeneration = generation;
    dispatchPending = true;
    setLanes({ ...lanes, [lane]: lanes[lane].slice(1) });
    dispatchPending = false;
    const restoreFailure = () => {
      if (!retireFailure(dispatchId)) return;
      if (busyEdges === busyEdgesBeforeRun) {
        running = false;
        if (generation === dispatchGeneration) restore(lane, dispatch);
        else advance();
      }
    };
    try {
      observeRun(
        driver.run(dispatchTransform(message), { steer: false }),
        restoreFailure,
      );
    } catch (error) {
      restoreFailure();
      throw error;
    }
  };

  const interrupt = (
    dispatch: DispatchItem,
    restoreLane: Lane = "steer",
    restoreIndex = 0,
  ) => {
    paused = false;
    const dispatchGeneration = generation;
    suppressIdle.push(
      ...(cancelSettles.length ? cancelSettles : [activeDispatch]),
    );
    cancelSettles = [];
    const dispatchId = { started: false };
    activeDispatch = dispatchId;
    const restoreInterrupted = (replacementStarted = false) => {
      if (!retireFailure(dispatchId) || replacementStarted) return;
      const pendingSettles = suppressIdle.length;
      const pending = suppressIdle.pop();
      cancelSettles = pendingSettles > 0 ? [pending] : [];
      running = pendingSettles > 0;
      if (generation === dispatchGeneration)
        restore(restoreLane, dispatch, restoreIndex);
      else advance();
    };
    // a driver whose cancel routes through the runtime notifies this queue
    // back; the interrupt already accounted for that settle and is dispatching
    // in its place
    interrupting = true;
    try {
      driver.cancel!();
    } catch (error) {
      restoreInterrupted();
      throw error;
    } finally {
      interrupting = false;
    }
    running = true;
    const busyEdgesBeforeRun = busyEdges;
    const restoreFailure = () => {
      restoreInterrupted(busyEdges !== busyEdgesBeforeRun);
    };
    try {
      observeRun(
        driver.run(dispatchTransform(dispatch.message), { steer: true }),
        restoreFailure,
      );
    } catch (error) {
      restoreFailure();
      throw error;
    }
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
    if (running && !dispatchPending && driver.cancel) {
      const id = generateId();
      interrupt({ id, item: toItem(id, message), message });
      return;
    }
    push("steer", message);
  };

  const move = (queueItemId: string, placement: QueuePlacement) => {
    const fromLane = laneOf(queueItemId);
    if (!fromLane) throw new Error(`Unknown queue item "${queueItemId}".`);
    const toLane = placement.lane ?? fromLane;

    const fromIndex = lanes[fromLane].findIndex((i) => i.id === queueItemId);
    const item = lanes[fromLane][fromIndex]!;
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
      !dispatchPending &&
      driver.cancel
    ) {
      const message = messages.get(queueItemId)!;
      messages.delete(queueItemId);
      setLanes({
        queue: lanes.queue.filter((i) => i.id !== queueItemId),
        steer: lanes.steer,
      });
      interrupt({ id: queueItemId, item, message }, fromLane, fromIndex);
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

  const notifyCancelled = () => {
    if (interrupting || dispatchPending) return;
    if (running && cancelSettles.length === 0) {
      paused = true;
      cancelSettles = [activeDispatch];
    }
  };

  const adapter: ExternalThreadQueueAdapter = {
    items: lanes.queue,
    steerItems: lanes.steer,
    enqueue,
    steer,
    move,
    edit,
    remove,
    __internal_setDispatchTransform: (transform) => {
      dispatchTransform = transform;
    },
    __internal_notifyCancelled: notifyCancelled,
  };

  return {
    adapter,
    hold: () => {
      held = true;
    },
    release: () => {
      held = false;
      advance();
    },
    notifyBusy: () => {
      paused = false;
      // a cancelled run's settle that is still outstanding belongs to a run
      // this new one replaces; swallow it entirely
      if (cancelSettles.length > 0) {
        suppressIdle.push(...cancelSettles);
        cancelSettles = [];
        activeDispatch = undefined;
      } else if (activeDispatch) {
        activeDispatch.started = true;
      }
      running = true;
      busyEdges++;
    },
    notifyIdle: () => {
      if (suppressIdle.length > 0) {
        suppressIdle.shift();
        return;
      }
      cancelSettles.shift();
      running = false;
      advance();
    },
    notifyCancelled,
    clear: () => {
      generation++;
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
