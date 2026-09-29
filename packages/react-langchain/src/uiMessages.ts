import type { Channel } from "@langchain/react";
import { isJSONValueEqual } from "@assistant-ui/core/internal";
import type { RemoveUIMessage, UIMessage } from "./types";

/** Channels the generative-UI fold reads, at the root and per subagent. */
export const UI_CUSTOM_CHANNELS: readonly Channel[] = ["custom"];

export type UIUpdate = UIMessage | RemoveUIMessage;

export const isUIUpdate = (
  value: unknown,
): value is UIUpdate | readonly UIUpdate[] => {
  if (Array.isArray(value)) return value.length > 0 && value.every(isUIUpdate);
  if (value == null || typeof value !== "object") return false;
  const v = value as {
    type?: unknown;
    id?: unknown;
    name?: unknown;
    props?: unknown;
  };
  if (typeof v.id !== "string") return false;
  if (v.type === "remove-ui") return true;
  return (
    v.type === "ui" &&
    typeof v.name === "string" &&
    typeof v.props === "object" &&
    v.props !== null
  );
};

export const applyUIUpdate = (
  list: readonly UIMessage[],
  update: UIUpdate | readonly UIUpdate[],
): UIMessage[] => {
  const events = Array.isArray(update) ? update : [update as UIUpdate];
  let next = list.slice();
  for (const event of events) {
    if (event.type === "remove-ui") {
      next = next.filter((ui) => ui.id !== event.id);
      continue;
    }
    const index = next.findIndex((ui) => ui.id === event.id);
    if (index === -1) {
      next.push(event);
      continue;
    }
    next[index] =
      event.metadata?.merge === true
        ? { ...event, props: { ...next[index]!.props, ...event.props } }
        : event;
  }
  return next;
};

/**
 * Pulls a UI update out of a raw `custom`-channel event. The graph writes the
 * `UIMessage` straight to the channel, so it lands at `params.data`; some
 * transports wrap it one level deeper at `params.data.payload`.
 */
export const extractUIUpdate = (
  event: unknown,
): UIUpdate | readonly UIUpdate[] | undefined => {
  const data = (event as { params?: { data?: unknown } } | null)?.params?.data;
  if (isUIUpdate(data)) return data;
  const payload = (data as { payload?: unknown } | undefined)?.payload;
  if (isUIUpdate(payload)) return payload;
  return undefined;
};

export type UIFoldMemo = {
  events: readonly unknown[];
  messages: UIMessage[];
};

export const createUIFoldMemo = (): UIFoldMemo => ({
  events: [],
  messages: [],
});

/**
 * Folds `custom`-channel events into UI messages, continuing the fold held in
 * `memo`. The channel buffer holds each event object once, appends new events
 * and drops its oldest ones once full, so only events after the previously
 * folded last event are applied, and entries no later event touches keep
 * their identity. A buffer that no longer contains that event was replaced
 * and is folded from scratch.
 */
export const foldUIUpdates = (
  events: readonly unknown[],
  memo: UIFoldMemo = createUIFoldMemo(),
): UIMessage[] => {
  const previous = memo.events;
  const resumeAt =
    previous.length === 0
      ? 0
      : events.lastIndexOf(previous.at(-1), previous.length - 1) + 1;
  let acc = previous.length > 0 && resumeAt === 0 ? [] : memo.messages;
  for (let i = resumeAt; i < events.length; i++) {
    const update = extractUIUpdate(events[i]);
    if (update) acc = applyUIUpdate(acc, update);
  }
  memo.events = events;
  memo.messages = acc;
  return acc;
};

export type UISnapshotMemo = {
  snapshot: unknown;
  entries: readonly UIMessage[];
};

export const createUISnapshotMemo = (): UISnapshotMemo => ({
  snapshot: undefined,
  entries: [],
});

/**
 * Recovers entry identity across `values` events. The SDK rebuilds the
 * `values` object from every snapshot and reconciles only the messages slot by
 * id, so an unchanged UI list arrives as a new array of new objects on every
 * superstep. An entry structurally equal to the previous entry with its id is
 * replaced by that previous object, and a list whose entries all survive in
 * place is replaced by the previous list.
 */
export const reconcileUISnapshot = (
  snapshot: unknown,
  memo: UISnapshotMemo,
): readonly UIMessage[] => {
  if (snapshot === memo.snapshot) return memo.entries;
  memo.snapshot = snapshot;
  if (!Array.isArray(snapshot)) {
    if (memo.entries.length > 0) memo.entries = [];
    return memo.entries;
  }
  const previous = memo.entries;
  const previousById = new Map(previous.map((ui) => [ui.id, ui]));
  let same = snapshot.length === previous.length;
  const entries = (snapshot as UIMessage[]).map((ui, index) => {
    const before = previousById.get(ui.id);
    const entry =
      before !== undefined && isJSONValueEqual(before, ui) ? before : ui;
    if (entry !== previous[index]) same = false;
    return entry;
  });
  if (!same) memo.entries = entries;
  return memo.entries;
};

/**
 * Merges live-streamed UI with the state snapshot. The snapshot is
 * authoritative by id: once a UI lands in graph state it supersedes its live
 * copy. A consequence is that a live `remove-ui` is overridden while the
 * snapshot still contains that id; the removal only takes visible effect once
 * the snapshot catches up.
 */
export const mergeUIMessages = (
  live: readonly UIMessage[],
  snapshot: unknown,
): UIMessage[] => {
  const byId = new Map<string, UIMessage>();
  for (const ui of live) byId.set(ui.id, ui);
  if (Array.isArray(snapshot)) {
    for (const ui of snapshot as UIMessage[]) byId.set(ui.id, ui);
  }
  return [...byId.values()];
};
