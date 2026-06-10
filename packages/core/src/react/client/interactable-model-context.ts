import type { Tool } from "assistant-stream";
import type {
  InteractableDefinition,
  InteractableStateSchema,
} from "../types/scopes/interactables";
import type { InteractableSnapshotEntry } from "../../model-context/interactable-composer-metadata";

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
        type: "frontend",
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

  const interactables: InteractableSnapshotEntry[] = entries.map((def) => ({
    id: def.id,
    name: def.name,
    state: def.state,
  }));
  return { tools, unstable_composerMetadata: { interactables } };
}
