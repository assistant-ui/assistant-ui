import type { Tool } from "assistant-stream";
import type {
  InteractableDefinition,
  InteractableStateSchema,
} from "../types/scopes/interactables";
import { isJSONValueEqual } from "../../utils/json/is-json-equal";

type InteractableSnapshotEntry = { id: string; name: string; state: unknown };

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
    const items = msg.metadata?.custom?.interactables as
      | InteractableSnapshotEntry[]
      | undefined;
    const entry = items?.find((it) => it.id === id);
    if (entry) return entry;
  }
  return undefined;
}

/** Ungated entry with the `initialState` reference the send-time gate needs. */
type RawInteractableEntry = InteractableSnapshotEntry & { initialState: unknown };

/** Every interactable's current state, ungated (gated later in `handleSend`). */
function buildRawComposerMetadata(
  definitions: Record<string, InteractableDefinition>,
): Record<string, unknown> | undefined {
  const entries = Object.values(definitions);
  if (entries.length === 0) return undefined;
  const interactables: RawInteractableEntry[] = entries.map((def) => ({
    id: def.id,
    name: def.name,
    state: def.state,
    initialState: def.initialState,
  }));
  return { interactables };
}

/**
 * Write-once-per-change gate. Keeps interactables that changed since their last
 * snapshot in history (or `initialState` if none), strips `initialState`, and
 * passes other metadata keys through untouched.
 */
export function gateInteractableComposerMetadata(
  meta: Record<string, unknown> | undefined,
  messages: readonly SnapshotCarrierMessage[],
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const { interactables, ...rest } = meta as {
    interactables?: RawInteractableEntry[];
  } & Record<string, unknown>;

  const gated: Record<string, unknown> = { ...rest };
  if (Array.isArray(interactables)) {
    const pending: InteractableSnapshotEntry[] = [];
    for (const it of interactables) {
      const prior = findLatestSnapshotEntry(messages, it.id);
      const reference = prior ? prior.state : it.initialState;
      if (!isJSONValueEqual(it.state, reference)) {
        pending.push({ id: it.id, name: it.name, state: it.state });
      }
    }
    if (pending.length) gated.interactables = pending;
  }
  return Object.keys(gated).length ? gated : undefined;
}

export function shallowMerge(prev: unknown, partial: unknown): unknown {
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

export function buildInteractableModelContext(
  definitions: Record<string, InteractableDefinition>,
  partialSchemaCache: Map<string, InteractableStateSchema>,
  setDefState: (id: string, updater: (prev: unknown) => unknown) => void,
):
  | {
      tools: Record<string, Tool<any, any>>;
      unstable_composerMetadata?: Record<string, unknown>;
    }
  | undefined {
  const entries = Object.values(definitions);
  if (entries.length === 0) return undefined;

  const byName = new Map<string, InteractableDefinition[]>();
  for (const def of entries) {
    const list = byName.get(def.name) ?? [];
    list.push(def);
    byName.set(def.name, list);
  }

  const tools: Record<string, Tool<any, any>> = {};

  for (const [name, instances] of byName) {
    const isMulti = instances.length > 1;

    for (const def of instances) {
      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeId = def.id.replace(/[^a-zA-Z0-9_-]/g, "_");
      const toolName = isMulti
        ? `update_${safeName}_${safeId}`
        : `update_${safeName}`;

      const partialSchema = partialSchemaCache.get(def.id) ?? def.stateSchema;

      tools[toolName] = {
        type: "frontend" as const,
        description: `Update the state of interactable component "${name}"${isMulti ? ` (id: ${def.id})` : ""}. Only include the fields you want to change; omitted fields keep their current values. ${def.description}`,
        parameters: partialSchema,
        streamCall: async (reader) => {
          try {
            for await (const partialArgs of reader.args.streamValues()) {
              setDefState(def.id, (prev) => shallowMerge(prev, partialArgs));
            }
          } catch {
            // Non-fatal: execute handles the final state
          }
        },
        execute: async (partialState: unknown) => {
          setDefState(def.id, (prev) => shallowMerge(prev, partialState));
          return { success: true };
        },
      };
    }
  }

  const composerMetadata = buildRawComposerMetadata(definitions);
  return composerMetadata
    ? { tools, unstable_composerMetadata: composerMetadata }
    : { tools };
}
