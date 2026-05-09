import type { Tool } from "assistant-stream";
import type { Unsubscribe } from "../../..";

/**
 * Schema type matching Tool["parameters"] from assistant-stream.
 * Accepts both StandardSchemaV1 and JSONSchema7.
 */
export type InteractableStateSchema = NonNullable<
  Extract<Tool, { parameters: unknown }>["parameters"]
>;

export type InteractableDefinition = {
  id: string;
  name: string;
  description: string;
  stateSchema: InteractableStateSchema;
  state: unknown;
  selected?: boolean | undefined;
};

export type InteractableRegistration = {
  id: string;
  name: string;
  description: string;
  stateSchema: InteractableStateSchema;
  initialState: unknown;
  selected?: boolean | undefined;
};

export type InteractablePersistenceStatus = {
  isPending: boolean;
  error: unknown;
};

export type InteractablesState = {
  /** Keyed by instance id */
  definitions: Record<string, InteractableDefinition>;
  /** Per-id persistence sync status */
  persistence: Record<string, InteractablePersistenceStatus>;
};

export type InteractablePersistedState = Record<
  string,
  { name: string; state: unknown }
>;

export type InteractablePersistenceAdapter = {
  save(state: InteractablePersistedState): void | Promise<void>;
};

export type InteractablesMethods = {
  getState(): InteractablesState;
  register(def: InteractableRegistration): Unsubscribe;
  setState(id: string, updater: (prev: unknown) => unknown): void;
  setSelected(id: string, selected: boolean): void;
  exportState(): InteractablePersistedState;
  importState(saved: InteractablePersistedState): void;
  setPersistenceAdapter(
    adapter: InteractablePersistenceAdapter | undefined,
  ): void;
  flush(): Promise<void>;
};

export type InteractablesClientSchema = {
  methods: InteractablesMethods;
};
