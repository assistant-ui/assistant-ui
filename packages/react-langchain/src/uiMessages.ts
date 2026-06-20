import type { RemoveUIMessage, UIMessage } from "./types";

export type UIUpdate = UIMessage | RemoveUIMessage;

export const isUIUpdate = (
  value: unknown,
): value is UIUpdate | readonly UIUpdate[] => {
  if (Array.isArray(value)) return value.every(isUIUpdate);
  if (value == null || typeof value !== "object") return false;
  const v = value as { type?: unknown; id?: unknown };
  if (typeof v.id !== "string") return false;
  return v.type === "ui" || v.type === "remove-ui";
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
 * transports wrap it one level deeper at `params.data.payload`. Non-UI custom
 * events are ignored.
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

/**
 * Merges live-streamed UI with the state snapshot. The snapshot is
 * authoritative by id: once a UI lands in graph state it supersedes its live
 * copy. Non-array snapshots are ignored.
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
