import type { Tool } from "assistant-stream";
import { toJSONSchema } from "assistant-stream";
import type { Unstable_InteractableDefinition } from "../types/scopes/interactables";
import {
  interactableToolName,
  shallowMergeInteractableState,
  type Unstable_InteractableSnapshotEntry,
} from "../../model-context/interactable-composer-metadata";

export type PartialJSONSchema = ReturnType<typeof toJSONSchema>;

const ID_PROPERTY = {
  type: "string" as const,
  description:
    "The id of the instance to update, as shown in its state snapshot in the conversation.",
};

/**
 * Wraps an interactable's partial state schema with the required `id`
 * parameter. Falls back to a permissive schema when the partial conversion
 * failed at registration time.
 */
function withRequiredId(partial: PartialJSONSchema | undefined) {
  if (!partial || typeof partial !== "object" || partial.type !== "object") {
    return {
      type: "object" as const,
      properties: { id: ID_PROPERTY },
      required: ["id"],
      additionalProperties: true,
    };
  }
  if (process.env.NODE_ENV !== "production" && partial.properties?.id) {
    console.warn(
      `[Interactables] a top-level "id" field in an interactable's stateSchema is ` +
        `reserved for instance addressing by the update tool and cannot be updated ` +
        `by the model. Rename the field to make it model-writable.`,
    );
  }
  const { id: _reserved, ...properties } = partial.properties ?? {};
  return {
    ...partial,
    properties: { id: ID_PROPERTY, ...properties },
    required: ["id"],
  };
}

export function buildInteractableModelContext(
  definitions: Record<string, Unstable_InteractableDefinition>,
  partialSchemaCache: Map<string, PartialJSONSchema>,
  setDefState: (id: string, updater: (prev: unknown) => unknown) => void,
):
  | {
      tools: Record<string, Tool<any, any>>;
      unstable_composerMetadata?: Record<string, unknown>;
    }
  | undefined {
  const entries = Object.values(definitions);
  if (entries.length === 0) return undefined;

  const byName = new Map<string, Unstable_InteractableDefinition[]>();
  for (const def of entries) {
    const list = byName.get(def.name) ?? [];
    list.push(def);
    byName.set(def.name, list);
  }

  const tools: Record<string, Tool<any, any>> = {};

  for (const [name, instances] of byName) {
    const toolName = interactableToolName(name);
    if (tools[toolName]) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[Interactables] interactable names "${name}" and another registered name ` +
            `both sanitize to the tool name "${toolName}". Rename one of them.`,
        );
      }
      continue;
    }

    const first = instances[0]!;

    // `id` resolves to a definition of this name; an id-less call is accepted
    // only while exactly one instance exists.
    const resolveTarget = (
      id: unknown,
    ): Unstable_InteractableDefinition | undefined => {
      if (typeof id === "string") {
        const def = definitions[id];
        return def?.name === name ? def : undefined;
      }
      return instances.length === 1 ? first : undefined;
    };

    tools[toolName] = {
      type: "frontend",
      description:
        `Update the state of interactable component "${name}". ${first.description} ` +
        `Pass the id of the instance to update — instance ids and current state ` +
        `appear in the conversation as state snapshots. Only include the fields ` +
        `you want to change; omitted fields keep their current values.`,
      parameters: withRequiredId(partialSchemaCache.get(first.id)),
      streamCall: async (reader) => {
        try {
          for await (const partialArgs of reader.args.streamValues()) {
            if (!partialArgs || typeof partialArgs !== "object") continue;
            const args = partialArgs as Record<string, unknown>;
            const keys = Object.keys(args);
            const idIndex = keys.indexOf("id");
            if (idIndex === keys.length - 1) continue;

            const { id, ...partial } = args;
            if (Object.keys(partial).length === 0) continue;
            const target = resolveTarget(id);
            if (!target) continue;
            setDefState(target.id, (prev) =>
              shallowMergeInteractableState(prev, partial),
            );
          }
        } catch {
          // Non-fatal: execute handles the final state
        }
      },
      execute: async (args: unknown) => {
        const { id, ...partial } = (args ?? {}) as Record<string, unknown>;
        const target = resolveTarget(id);
        if (!target) {
          const validIds = instances.map((d) => d.id);
          return {
            success: false,
            error: `Unknown id ${JSON.stringify(id)} for interactable "${name}". Valid ids: ${validIds.join(", ")}`,
          };
        }
        setDefState(target.id, (prev) =>
          shallowMergeInteractableState(prev, partial),
        );
        // The resolved id lets an id-less call's UI (and the model) address
        // the instance that was actually updated.
        return { success: true, id: target.id };
      },
    };
  }

  const interactables: Unstable_InteractableSnapshotEntry[] = entries.map(
    (def) => ({
      id: def.id,
      name: def.name,
      state: def.state,
    }),
  );
  return { tools, unstable_composerMetadata: { interactables } };
}
