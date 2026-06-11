import { useEffect, useId, useRef } from "react";
import { useAui, useAuiState } from "@assistant-ui/store";
import type {
  InteractableScope,
  InteractableStateSchema,
} from "../types/scopes/interactables";
import { useInteractableState } from "./useInteractableState";

/**
 * The state type described by an interactable's `stateSchema`. Resolves the
 * output type of a StandardSchemaV1 schema (e.g. Zod); plain JSON Schema
 * falls back to `unknown`.
 */
export type InferInteractableState<TSchema> = TSchema extends {
  "~standard": { types?: { output: infer TOutput } | undefined };
}
  ? TOutput
  : unknown;

export type InteractableConfig<TSchema extends InteractableStateSchema> = {
  description: string;
  stateSchema: TSchema;
  initialState: InferInteractableState<TSchema>;
  /** Unique instance ID; required to address this instance when multiple interactables share a name. Auto-generated if omitted. */
  id?: string;
  /**
   * Persistence + reload-seed source. `"app"` (default) participates in the BYO
   * adapter; `"thread"` persists via the per-send snapshot in thread history.
   */
  scope?: InteractableScope;
};

/**
 * Registers an interactable with the AI assistant and returns its state, like
 * `useState` that the model can also read and update.
 *
 * Call this once per interactable instance. Other components can read and
 * write the same instance by passing its `id` to {@link useInteractableState}.
 */
export const useInteractable = <TSchema extends InteractableStateSchema>(
  name: string,
  config: InteractableConfig<TSchema>,
): readonly [
  InferInteractableState<TSchema>,
  {
    id: string;
    setState: (
      updater:
        | InferInteractableState<TSchema>
        | ((
            prev: InferInteractableState<TSchema>,
          ) => InferInteractableState<TSchema>),
    ) => void;
    isPending: boolean;
    error: unknown;
    flush: () => Promise<void>;
  },
] => {
  const aui = useAui();

  const autoId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = config.id ?? autoId;

  const stateSchemaRef = useRef(config.stateSchema);
  stateSchemaRef.current = config.stateSchema;
  const initialStateRef = useRef(config.initialState);
  initialStateRef.current = config.initialState;

  const interactables = useAuiState(() => aui.interactables());

  useEffect(() => {
    return interactables.register({
      id,
      name,
      description: config.description,
      stateSchema: stateSchemaRef.current,
      initialState: initialStateRef.current,
      scope: config.scope,
    });
  }, [interactables, id, name, config.description, config.scope]);

  const [registeredState, methods] =
    useInteractableState<InferInteractableState<TSchema>>(id);

  const state =
    registeredState === undefined ? config.initialState : registeredState;

  return [state, { id, ...methods }] as const;
};
