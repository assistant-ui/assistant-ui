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
  InteractableRegistration,
  InteractableStateSchema,
} from "../types/scopes/interactables";
import { toJSONSchema, toPartialJSONSchema } from "assistant-stream";
import { ModelContext } from "../../store";
import { buildInteractableModelContext } from "./interactable-model-context";

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
        return (
          buildInteractableModelContext(
            defs,
            partialSchemaCacheRef.current,
            setDefState,
          ) ?? {}
        );
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
