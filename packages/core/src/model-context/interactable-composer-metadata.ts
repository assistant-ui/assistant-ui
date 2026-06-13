import { isJSONValueEqual } from "../utils/json/is-json-equal";
import { isJSONValue } from "../utils/json/is-json";

export type InteractableSnapshotEntry = {
  id: string;
  name: string;
  state: unknown;
  /**
   * When true, `state` carries only the top-level fields that changed since
   * the model's last known state; omitted fields are unchanged. The first
   * snapshot of an instance is always full.
   */
  partial?: boolean | undefined;
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
  if (entry.partial) {
    return `[State of "${entry.name}" (id: ${JSON.stringify(entry.id)}) changed — updated fields: ${JSON.stringify(entry.state)}; fields not listed are unchanged]`;
  }
  return `[Current state of "${entry.name}" (id: ${JSON.stringify(entry.id)}): ${JSON.stringify(entry.state)}]`;
}

/** The model-facing tool name for an interactable `name`. One tool per name. */
export function interactableToolName(name: string): string {
  return `update_${name.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The merge `update_*` tools apply: top-level keys replace, rest preserved. */
export function shallowMergeInteractableState(
  prev: unknown,
  partial: unknown,
): unknown {
  if (!isPlainObject(prev) || !isPlainObject(partial)) return partial;
  return { ...prev, ...partial };
}

/**
 * The top-level fields of `next` that differ from `known`, for stamping a
 * partial snapshot. Returns `undefined` when a partial stamp has no benefit:
 * the change is not expressible as a shallow merge (non-object states, or a
 * top-level key was removed), or every field changed anyway — the caller
 * falls back to a full snapshot.
 */
function shallowDiffInteractableState(
  known: unknown,
  next: unknown,
): Record<string, unknown> | undefined {
  if (!isPlainObject(known) || !isPlainObject(next)) return undefined;
  for (const key of Object.keys(known)) {
    if (!(key in next)) return undefined;
  }
  const diff: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(next)) {
    if (!(key in known) || !isJSONValueEqual(known[key], value)) {
      diff[key] = value;
    }
  }
  const changed = Object.keys(diff).length;
  if (changed === 0 || changed === Object.keys(next).length) return undefined;
  return diff;
}

type ToolCallLikePart = {
  type?: string;
  toolCallId?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
};

const asToolCallPart = (part: unknown): ToolCallLikePart | undefined => {
  if (!part || typeof part !== "object") return undefined;
  const p = part as ToolCallLikePart;
  return p.type === "tool-call" ? p : undefined;
};

/** Whether an accepted `update_*` call addressed instance `id`. */
const updateCallTargets = (p: ToolCallLikePart, id: string): boolean => {
  if (!p.args || typeof p.args !== "object") return false;
  const result = isPlainObject(p.result) ? p.result : undefined;
  if (result?.success === false) return false;
  if (typeof result?.id === "string") return result.id === id;
  const argsId = (p.args as Record<string, unknown>).id;
  return argsId === id || argsId === undefined;
};

export type InteractableVersion = {
  /** The full state as of this version. */
  state: unknown;
  origin: "create" | "update" | "user-edit";
  /** For create/update versions, the tool call that produced this version. */
  toolCallId?: string | undefined;
};

// Without this, every mounted anchor re-folds the whole thread on each streaming
// token, since the repository hands out a new messages array per token.
const versionsCache = new WeakMap<
  readonly SnapshotCarrierMessage[],
  Map<string, Map<string, InteractableVersion[]>>
>();

/**
 * Every version of interactable `id` recorded in the thread, oldest first,
 * folded chronologically:
 *
 * - the tool call whose `toolCallId` equals `id` seeds the baseline with its
 *   args (`origin: "create"`) — the `id: toolCallId` convention for
 *   tool-created interactables,
 * - a snapshot stamped on a user message is a `"user-edit"` version (a full
 *   snapshot replaces the state; a partial one shallow-merges),
 * - each accepted `update_*` call shallow-merges an `"update"` version.
 *
 * The last entry is the state the model knows. Partial snapshots and update
 * calls with no baseline to merge into are skipped.
 */
export function getInteractableVersions(
  messages: readonly SnapshotCarrierMessage[],
  id: string,
  name: string,
): InteractableVersion[] {
  let byName = versionsCache.get(messages);
  if (!byName) {
    byName = new Map();
    versionsCache.set(messages, byName);
  }
  let byId = byName.get(name);
  if (!byId) {
    byId = new Map();
    byName.set(name, byId);
  }
  const cached = byId.get(id);
  if (cached) return cached;

  const toolName = interactableToolName(name);
  const versions: InteractableVersion[] = [];
  const current = () => versions[versions.length - 1];

  for (const msg of messages) {
    if (msg.role === "user") {
      const entry = getInteractableSnapshots(msg)?.find((it) => it.id === id);
      if (!entry) continue;
      if (entry.partial) {
        const prev = current();
        if (prev) {
          versions.push({
            state: shallowMergeInteractableState(prev.state, entry.state),
            origin: "user-edit",
          });
        }
      } else {
        versions.push({ state: entry.state, origin: "user-edit" });
      }
      continue;
    }

    if (msg.role !== "assistant") continue;
    for (const part of msg.content ?? []) {
      const p = asToolCallPart(part);
      if (!p) continue;
      if (p.toolCallId === id) {
        if (p.args && typeof p.args === "object") {
          versions.push({ state: p.args, origin: "create", toolCallId: id });
        }
      } else if (p.toolName === toolName && updateCallTargets(p, id)) {
        const prev = current();
        if (prev) {
          const { id: _id, ...partial } = p.args as Record<string, unknown>;
          versions.push({
            state: shallowMergeInteractableState(prev.state, partial),
            origin: "update",
            toolCallId: p.toolCallId,
          });
        }
      }
    }
  }
  byId.set(id, versions);
  return versions;
}

/**
 * The state the model knows for interactable `id` — its latest recorded
 * version, or `undefined` when no baseline exists yet.
 */
export function findModelKnownState(
  messages: readonly SnapshotCarrierMessage[],
  id: string,
  name: string,
): { state: unknown } | undefined {
  const versions = getInteractableVersions(messages, id, name);
  const last = versions[versions.length - 1];
  return last ? { state: last.state } : undefined;
}

/**
 * Snapshot gate. Stamps an interactable only when the model doesn't already
 * know its state (no baseline yet, or the live state differs from the folded
 * thread record). A change that fits a shallow merge is stamped as a partial
 * snapshot carrying just the changed fields; otherwise the full state is
 * stamped. Other metadata keys pass through untouched.
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
      if (!known) {
        pending.push({ id: it.id, name: it.name, state: it.state });
        continue;
      }
      if (isJSONValueEqual(it.state, known.state)) continue;
      const diff = shallowDiffInteractableState(known.state, it.state);
      pending.push(
        diff
          ? { id: it.id, name: it.name, state: diff, partial: true }
          : { id: it.id, name: it.name, state: it.state },
      );
    }
    if (pending.length) gated.interactables = pending;
  }
  return Object.keys(gated).length ? gated : undefined;
}
