import type { Tool } from "assistant-stream";
import type { Unsubscribe } from "../../..";
import type { ToolCallMessagePartComponent } from "../MessagePartComponentTypes";

/**
 * Schema type matching Tool["parameters"] from assistant-stream.
 * Accepts both StandardSchemaV1 and JSONSchema7.
 */
export type InteractableStateSchema = NonNullable<
  Extract<Tool, { parameters: unknown }>["parameters"]
>;

export type InteractableScope = "app" | "thread";

export type InteractableDefinition = {
  id: string;
  name: string;
  description: string;
  stateSchema: InteractableStateSchema;
  state: unknown;
  initialState: unknown;
  scope?: InteractableScope | undefined;
};

export type InteractableRegistration = {
  id: string;
  name: string;
  description: string;
  stateSchema: InteractableStateSchema;
  initialState: unknown;
  scope?: InteractableScope | undefined;
  /**
   * Component installed as the tool UI for this interactable's `update_{name}`
   * tool calls, so a model edit re-renders the interactable at the message
   * that made it. Registered once per name; requires the `tools` scope.
   */
  updateRender?: ToolCallMessagePartComponent | undefined;
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
  /**
   * Restores previously saved state. Called when the adapter is attached;
   * loaded state seeds app-scoped interactables that have not been locally
   * edited yet (a local edit always wins over a slow load).
   */
  load?():
    | InteractablePersistedState
    | null
    | undefined
    | Promise<InteractablePersistedState | null | undefined>;
};

export type InteractablesConfig = {
  persistence?: InteractablePersistenceAdapter | undefined;
};

export type InteractablesMethods = {
  getState(): InteractablesState;
  register(def: InteractableRegistration): Unsubscribe;
  setState(id: string, updater: (prev: unknown) => unknown): void;
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
