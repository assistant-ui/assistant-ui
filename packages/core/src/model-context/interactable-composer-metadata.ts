import { isJSONValueEqual } from "../utils/json/is-json-equal";
import { isJSONValue } from "../utils/json/is-json";

export type InteractableSnapshotEntry = {
  id: string;
  name: string;
  state: unknown;
};

/**
 * Minimal message shape needed to read snapshots and `update_*` tool calls out
 * of history. Structurally compatible with both `ThreadMessage` and the AI
 * SDK's `UIMessage`.
 */
type SnapshotCarrierMessage = {
  role: string;
  metadata?: unknown;
  content?: readonly unknown[] | undefined;
};

/**
 * Reads the interactable snapshots stamped on a message's
 * `metadata.custom.interactables`, or `undefined` if none. This is the read
 * half of the snapshot channel — integrations use it to surface interactable
 * state to the model (see `injectInteractableContext` in
 * `@assistant-ui/react-ai-sdk` for the AI SDK implementation).
 */
export function getInteractableSnapshots(message: {
  metadata?: unknown;
}): InteractableSnapshotEntry[] | undefined {
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object") return undefined;
  const custom = (metadata as Record<string, unknown>).custom;
  if (!custom || typeof custom !== "object") return undefined;
  const items = (custom as Record<string, unknown>).interactables;
  return Array.isArray(items)
    ? (items as InteractableSnapshotEntry[])
    : undefined;
}

/** Canonical model-facing wording for one snapshot entry. */
export function formatInteractableSnapshot(
  entry: InteractableSnapshotEntry,
): string {
  return `[Current state of "${entry.name}" (id: ${JSON.stringify(entry.id)}): ${JSON.stringify(entry.state)}]`;
}

/** The model-facing tool name for an interactable `name`. One tool per name. */
export function interactableToolName(name: string): string {
  return `update_${name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

/** The merge `update_*` tools apply: top-level keys replace, rest preserved. */
export function shallowMergeInteractableState(
  prev: unknown,
  partial: unknown,
): unknown {
  if (
    typeof prev !== "object" ||
    prev === null ||
    typeof partial !== "object" ||
    partial === null ||
    Array.isArray(prev) ||
    Array.isArray(partial)
  ) {
    return partial;
  }
  return {
    ...(prev as Record<string, unknown>),
    ...(partial as Record<string, unknown>),
  };
}

/** The most recent snapshot stamped for `id`, or `undefined` if none. */
export function findLatestSnapshotEntry(
  messages: readonly SnapshotCarrierMessage[],
  id: string,
): InteractableSnapshotEntry | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (msg.role !== "user") continue;
    const entry = getInteractableSnapshots(msg)?.find((it) => it.id === id);
    if (entry) return entry;
  }
  return undefined;
}

type ToolCallLikePart = {
  type?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
};

/**
 * The state the model already knows for interactable `id`: its latest user
 * snapshot, plus every later assistant `update_*` call it made itself (the
 * model knows the outcome of its own tool calls, so they don't need to be
 * re-snapshotted). Returns `undefined` when no baseline exists yet.
 */
export function findModelKnownState(
  messages: readonly SnapshotCarrierMessage[],
  id: string,
  name: string,
): { state: unknown } | undefined {
  let baseline: unknown;
  let foldFrom = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (msg.role !== "user") continue;
    const entry = getInteractableSnapshots(msg)?.find((it) => it.id === id);
    if (entry) {
      baseline = entry.state;
      foldFrom = i + 1;
      break;
    }
  }
  if (foldFrom === -1) return undefined;

  const toolName = interactableToolName(name);
  let state = baseline;
  for (let i = foldFrom; i < messages.length; i++) {
    const msg = messages[i]!;
    if (msg.role !== "assistant") continue;
    for (const part of msg.content ?? []) {
      if (!part || typeof part !== "object") continue;
      const p = part as ToolCallLikePart;
      if (p.type !== "tool-call" || p.toolName !== toolName) continue;
      if (!p.args || typeof p.args !== "object") continue;
      // Rejected calls (unknown id) never reached the client state.
      if (
        p.result &&
        typeof p.result === "object" &&
        (p.result as Record<string, unknown>).success === false
      ) {
        continue;
      }
      const { id: argsId, ...partial } = p.args as Record<string, unknown>;
      if (argsId !== id && argsId !== undefined) continue;
      state = shallowMergeInteractableState(state, partial);
    }
  }
  return { state };
}

/**
 * Snapshot gate. Stamps an interactable when the model doesn't already know
 * its state: no snapshot yet in history (the first send establishes the
 * baseline), or its live state differs from the latest snapshot folded with
 * the model's own later `update_*` calls. Other metadata keys pass through
 * untouched.
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
      const known = findModelKnownState(messages, it.id, it.name);
      if (!known || !isJSONValueEqual(it.state, known.state)) {
        pending.push({ id: it.id, name: it.name, state: it.state });
      }
    }
    if (pending.length) gated.interactables = pending;
  }
  return Object.keys(gated).length ? gated : undefined;
}
