import type { Tool, toJSONSchema } from "assistant-stream";
import { getPartialJsonObjectMeta } from "assistant-stream/utils";
import { overlayPartialPath } from "../../model-context/interactable-composer-metadata";
import type { InteractableDefinition } from "./scopes";

export type StateJSONSchema = ReturnType<typeof toJSONSchema>;

// The spread also drops the non-enumerable `~standard` zod attaches to its
// JSON Schema output; carried over, the tool runtime would validate every
// partial update against the full state schema.
const withoutRootRequired = ({
  required: _required,
  ...schema
}: StateJSONSchema) => schema;

export function buildInteractableModelContext(
  definitions: Record<string, InteractableDefinition>,
  schemaCache: Map<string, StateJSONSchema>,
  setDefState: (id: string, updater: (prev: unknown) => unknown) => void,
): { system: string; tools: Record<string, Tool<any, any>> } | undefined {
  const entries = Object.values(definitions);
  if (entries.length === 0) return undefined;

  const byName = new Map<string, InteractableDefinition[]>();
  for (const def of entries) {
    const list = byName.get(def.name) ?? [];
    list.push(def);
    byName.set(def.name, list);
  }

  const systemParts: string[] = [];
  const tools: Record<string, Tool<any, any>> = {};

  for (const [name, instances] of byName) {
    const isMulti = instances.length > 1;

    for (const def of instances) {
      const selectedTag = def.selected ? " (SELECTED)" : "";
      const idTag = isMulti ? ` [id="${def.id}"]` : "";

      systemParts.push(
        `Interactable component "${name}"${idTag}${selectedTag} (${def.description}). Current state: ${JSON.stringify(def.state)}`,
      );

      const safeName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const safeId = def.id.replace(/[^a-zA-Z0-9_-]/g, "_");
      const toolName = isMulti
        ? `update_${safeName}_${safeId}`
        : `update_${safeName}`;

      const jsonSchema = schemaCache.get(def.id);

      tools[toolName] = {
        type: "frontend" as const,
        description: `Update the state of interactable component "${name}"${isMulti ? ` (id: ${def.id})` : ""}. Only include the fields you want to change; omitted fields keep their current values. A nested object replaces the existing one, so send it complete. ${def.description}`,
        parameters: jsonSchema
          ? withoutRootRequired(jsonSchema)
          : def.stateSchema,
        streamCall: async (reader) => {
          try {
            for await (const partialArgs of reader.args.streamValues()) {
              const partialPath = getPartialJsonObjectMeta(
                partialArgs as Record<symbol, unknown>,
              )?.partialPath;
              setDefState(def.id, (prev) =>
                overlayPartialPath(prev, partialArgs, partialPath),
              );
            }
          } catch {
            // Non-fatal: execute handles the final state
          }
        },
        execute: async (partialState: unknown) => {
          setDefState(def.id, (prev) => overlayPartialPath(prev, partialState));
          return { success: true };
        },
      };
    }
  }

  return { system: systemParts.join("\n"), tools };
}
