import {
  resource,
  tapState,
  tapEffect,
  tapCallback,
  tapRef,
  tapMemo,
} from "@assistant-ui/tap";
import {
  tapAssistantClientRef,
  type ClientOutput,
  attachTransformScopes,
} from "@assistant-ui/store";
import type {
  InteractablesState,
  InteractableDefinition,
  InteractableRegistration,
  InteractableStateSchema,
} from "../types/scopes/interactables";
import { toJSONSchema, toPartialJSONSchema } from "assistant-stream";
import type { Tool } from "assistant-stream";
import { ModelContext } from "../../store";

function shallowMerge(prev: unknown, partial: unknown): unknown {
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

export const Interactables = resource((): ClientOutput<"interactables"> => {
  const [state, setState] = tapState<InteractablesState>(() => ({
    definitions: {},
  }));

  const clientRef = tapAssistantClientRef();

  const stateRef = tapRef(state);
  tapEffect(() => {
    stateRef.current = state;
  }, [state]);

  const subscribersRef = tapRef(new Set<() => void>());

  const partialSchemaCacheRef = tapRef(
    new Map<string, InteractableStateSchema>(),
  );
  const detachedStateRef = tapRef(new Map<string, unknown>());

  const setDefState = tapCallback(
    (id: string, updater: (prev: unknown) => unknown) => {
      setState((prev) => {
        const existing = prev.definitions[id];
        if (!existing) return prev;
        return {
          ...prev,
          definitions: {
            ...prev.definitions,
            [id]: { ...existing, state: updater(existing.state) },
          },
        };
      });
    },
    [],
  );

  const setDefSelected = tapCallback((id: string, selected: boolean) => {
    setState((prev) => {
      const existing = prev.definitions[id];
      if (!existing) return prev;
      return {
        ...prev,
        definitions: {
          ...prev.definitions,
          [id]: { ...existing, selected },
        },
      };
    });
  }, []);

  const provider = tapMemo(
    () => ({
      getModelContext: () => {
        const defs = stateRef.current.definitions;
        const entries = Object.values(defs);
        if (entries.length === 0) return {};

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

            const partialSchema =
              partialSchemaCacheRef.current.get(def.id) ?? def.stateSchema;

            tools[toolName] = {
              type: "frontend" as const,
              description: `Update the state of interactable component "${name}"${isMulti ? ` (id: ${def.id})` : ""}. Only include the fields you want to change; omitted fields keep their current values. ${def.description}`,
              parameters: partialSchema,
              execute: async (partialState: unknown) => {
                setDefState(def.id, (prev) => shallowMerge(prev, partialState));
                return { success: true };
              },
            };
          }
        }

        return { system: systemParts.join("\n"), tools };
      },
      subscribe: (callback: () => void) => {
        subscribersRef.current.add(callback);
        return () => {
          subscribersRef.current.delete(callback);
        };
      },
    }),
    [setDefState],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: state dep triggers notification
  tapEffect(() => {
    for (const cb of subscribersRef.current) {
      cb();
    }
  }, [state]);

  tapEffect(() => {
    return clientRef.current!.modelContext().register(provider);
  }, [clientRef, provider]);

  const register = tapCallback((def: InteractableRegistration) => {
    try {
      const jsonSchema = toJSONSchema(def.stateSchema);
      partialSchemaCacheRef.current.set(
        def.id,
        toPartialJSONSchema(jsonSchema),
      );
    } catch (e) {
      // Fall back to the raw schema; partial updates may not work correctly
      console.warn(
        `[Interactables] Failed to create partial schema for "${def.name}". The update tool will require all fields.`,
        e,
      );
    }

    const detached = detachedStateRef.current.get(def.id);
    detachedStateRef.current.delete(def.id);

    setState((prev) => ({
      ...prev,
      definitions: {
        ...prev.definitions,
        [def.id]: {
          id: def.id,
          name: def.name,
          description: def.description,
          stateSchema: def.stateSchema,
          state:
            prev.definitions[def.id]?.state ?? detached ?? def.initialState,
          selected: def.selected,
        },
      },
    }));

    return () => {
      setState((prev) => {
        const existing = prev.definitions[def.id];
        if (existing) {
          detachedStateRef.current.set(def.id, existing.state);
        }
        partialSchemaCacheRef.current.delete(def.id);
        const { [def.id]: _, ...rest } = prev.definitions;
        return { ...prev, definitions: rest };
      });
    };
  }, []);

  return {
    getState: () => state,
    register,
    setState: setDefState,
    setSelected: setDefSelected,
  };
});

attachTransformScopes(Interactables, (scopes, parent) => {
  if (!scopes.modelContext && parent.modelContext.source === null) {
    scopes.modelContext = ModelContext();
  }
});
