import type { Tool } from "assistant-stream";
import { toJSONSchema } from "assistant-stream";
import type { Unstable_InteractableDefinition } from "../types/scopes/interactables";
import {
  interactableToolName,
  shallowMergeInteractableState,
  type Unstable_InteractableSnapshotEntry,
} from "../../model-context/interactable-composer-metadata";
import { generateId } from "../../utils/id";
import { isRecord } from "../../utils/json/is-json";

export type PartialJSONSchema = ReturnType<typeof toJSONSchema>;

const ID_PROPERTY = {
  type: "string" as const,
  description:
    "The id of the instance to update, as shown in its state snapshot in the conversation.",
};

const hasIdProperty = (schema: Record<string, unknown>) => {
  const properties = schema.properties;
  return isRecord(properties) && properties.id !== undefined;
};

const withRequiredItemId = (schema: Record<string, unknown>) => ({
  ...schema,
  required: ["id"],
});

// The framework assigns ids to new items, so the model never sees the `id`
// field when adding (it can't address an item that doesn't exist yet).
const withoutItemId = (schema: Record<string, unknown>) => {
  const { id: _omitted, ...properties } = isRecord(schema.properties)
    ? schema.properties
    : {};
  const required = Array.isArray(schema.required)
    ? schema.required.filter((key) => key !== "id")
    : schema.required;
  return { ...schema, properties, required };
};

const toArrayUpdateSchema = (schema: unknown, field: string) => {
  if (!isRecord(schema) || schema.type !== "array") return schema;
  const itemSchema = schema.items;
  if (Array.isArray(itemSchema) || !isRecord(itemSchema)) return schema;

  const idKeyed = hasIdProperty(itemSchema);
  const properties: Record<string, unknown> = {
    add: {
      type: "array",
      items: idKeyed ? withoutItemId(itemSchema) : itemSchema,
    },
    remove: {
      type: "array",
      items: idKeyed ? ID_PROPERTY : itemSchema,
    },
    clear: { type: "boolean" },
  };

  if (idKeyed) {
    properties.update = {
      type: "array",
      items: withRequiredItemId(itemSchema),
    };
  }

  return {
    type: "object" as const,
    description:
      `Operations for array field "${field}". To change one item use update ` +
      `with its id; add new items (their ids are assigned for you), remove items ` +
      `by id, or clear to empty. Change only the items you mean to — never resend ` +
      `the whole array to edit one item.`,
    properties,
    additionalProperties: false,
  };
};

// Top-level array fields whose items carry an `id` — the fields the framework
// mints ids for on add.
const idKeyedArrayFieldNames = (
  properties: Record<string, unknown>,
): Set<string> => {
  const names = new Set<string>();
  for (const [key, value] of Object.entries(properties)) {
    if (
      isRecord(value) &&
      value.type === "array" &&
      isRecord(value.items) &&
      hasIdProperty(value.items)
    ) {
      names.add(key);
    }
  }
  return names;
};

const withArrayUpdateSchemas = (properties: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      toArrayUpdateSchema(value, key),
    ]),
  );

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
    properties: { id: ID_PROPERTY, ...withArrayUpdateSchemas(properties) },
    required: ["id"],
  };
}

export function buildInteractableModelContext(
  definitions: Record<string, Unstable_InteractableDefinition>,
  partialSchemaCache: Map<string, PartialJSONSchema>,
  setDefState: (id: string, updater: (prev: unknown) => unknown) => void,
  streamBaselines = new Map<string, { targetId: string; state: unknown }>(),
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
    const partialSchema = partialSchemaCache.get(first.id);
    const idKeyedFields =
      partialSchema && isRecord(partialSchema.properties)
        ? idKeyedArrayFieldNames(partialSchema.properties)
        : new Set<string>();

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
      parameters: withRequiredId(partialSchema),
      streamCall: async (reader, { toolCallId }) => {
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

            const baseline = streamBaselines.get(toolCallId);
            const arrayBaseline =
              baseline?.targetId === target.id ? baseline.state : target.state;
            if (!baseline || baseline.targetId !== target.id) {
              streamBaselines.set(toolCallId, {
                targetId: target.id,
                state: target.state,
              });
            }

            setDefState(target.id, (prev) =>
              shallowMergeInteractableState(prev, partial, { arrayBaseline }),
            );
          }
        } catch {
          // Non-fatal: execute handles the final state
        }
      },
      execute: async (args: unknown, { toolCallId }) => {
        const { id, ...partial } = (args ?? {}) as Record<string, unknown>;
        const target = resolveTarget(id);
        if (!target) {
          const validIds = instances.map((d) => d.id);
          return {
            success: false,
            error: `Unknown id ${JSON.stringify(id)} for interactable "${name}". Valid ids: ${validIds.join(", ")}`,
          };
        }
        const baseline = streamBaselines.get(toolCallId);
        streamBaselines.delete(toolCallId);
        const addedItemIds: Record<string, string[]> = {};
        setDefState(target.id, (prev) =>
          shallowMergeInteractableState(prev, partial, {
            arrayBaseline:
              baseline?.targetId === target.id ? baseline.state : undefined,
            idFactory: (field) => {
              const itemId = generateId();
              (addedItemIds[field] ??= []).push(itemId);
              return itemId;
            },
            idKeyedFields,
          }),
        );
        // The resolved id lets an id-less call's UI (and the model) address
        // the instance that was actually updated.
        const result: {
          success: true;
          id: string;
          addedItemIds?: Record<string, string[]>;
        } = { success: true, id: target.id };
        if (Object.keys(addedItemIds).length > 0) {
          result.addedItemIds = addedItemIds;
        }
        return result;
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
