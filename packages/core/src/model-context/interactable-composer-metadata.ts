import { isJSONValueEqual } from "../utils/json/is-json-equal";
import { isJSONValue } from "../utils/json/is-json";

export type InteractableSnapshotEntry = {
  id: string;
  name: string;
  state: unknown;
};

/** Minimal `ThreadMessage` shape needed to read snapshots out of history. */
type SnapshotCarrierMessage = {
  role: string;
  metadata?: { custom?: Record<string, unknown> | undefined } | undefined;
};

/** The most recent snapshot stamped for `id`, or `undefined` if none. */
export function findLatestSnapshotEntry(
  messages: readonly SnapshotCarrierMessage[],
  id: string,
): InteractableSnapshotEntry | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (msg.role !== "user") continue;
    const raw = msg.metadata?.custom?.interactables;
    const entry = Array.isArray(raw)
      ? (raw as InteractableSnapshotEntry[]).find((it) => it.id === id)
      : undefined;
    if (entry) return entry;
  }
  return undefined;
}

/**
 * Snapshot gate. Stamps an interactable when it has no snapshot yet in history
 * (the first send establishes the model's baseline) or when its state differs
 * from its latest snapshot. Other metadata keys pass through untouched.
 */
export function gateInteractableComposerMetadata(
  meta: Record<string, unknown> | undefined,
  messages: readonly SnapshotCarrierMessage[],
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const { interactables, ...rest } = meta as {
    interactables?: InteractableSnapshotEntry[];
  } & Record<string, unknown>;

  const gated: Record<string, unknown> = { ...rest };
  if (Array.isArray(interactables)) {
    const pending: InteractableSnapshotEntry[] = [];
    for (const it of interactables) {
      if (process.env.NODE_ENV !== "production" && !isJSONValue(it.state)) {
        console.warn(
          `[Interactables] state for "${it.name}" (${it.id}) is not JSON-equatable ` +
            `(an undefined, NaN, Infinity, function, or symbol value?). It will be ` +
            `re-snapshotted on every send, recreating per-message growth. Use plain ` +
            `JSON values.`,
        );
      }
      const prior = findLatestSnapshotEntry(messages, it.id);
      if (!prior || !isJSONValueEqual(it.state, prior.state)) {
        pending.push({ id: it.id, name: it.name, state: it.state });
      }
    }
    if (pending.length) gated.interactables = pending;
  }
  return Object.keys(gated).length ? gated : undefined;
}
